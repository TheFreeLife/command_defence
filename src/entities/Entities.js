export class Entity {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.active = true;
    }
}

export class Base extends Entity {
    constructor(x, y) {
        super(x, y);
        this.maxHp = 99999999;
        this.hp = 99999999;
        this.size = 30;
    }

    draw(ctx) {
        ctx.fillStyle = '#00d2ff';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00d2ff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // HP Bar (Top)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(this.x - 20, this.y - 25, 40, 5);
        ctx.fillStyle = '#00d2ff';
        ctx.fillRect(this.x - 20, this.y - 25, (this.hp / this.maxHp) * 40, 5);
    }
}

export class Turret extends Entity {
    constructor(x, y, type = 'turret-basic') {
        super(x, y);
        this.type = type;
        this.target = null;
        this.angle = 0;
        this.lastFireTime = 0;

        // 타입별 초기 스탯 설정
        this.initStats();
        this.isPowered = false;
        this.maxHp = 100;
        this.hp = 100;
        this.size = 30;
    }

    initStats() {
        switch (this.type) {
            case 'turret-fast':
                this.range = 150;
                this.damage = 5;
                this.fireRate = 400; // 빨름
                this.color = '#39ff14'; // 네온 그린
                break;
            case 'turret-sniper':
                this.range = 450;
                this.damage = 60;
                this.fireRate = 3000; // 느림
                this.color = '#ff3131'; // 네온 레드
                break;
            case 'turret-tesla':
                this.range = 180;
                this.damage = 2; // 지속 딜 (틱당)
                this.fireRate = 100; // 매우 빠른 틱
                this.color = '#00ffff'; // 시안 (전기 색상)
                break;
            case 'turret-flamethrower':
                this.range = 140;
                this.damage = 3; // 지속 딜
                this.fireRate = 100; // 매우 빠른 틱
                this.color = '#ff6600'; // 주황색 (불꽃)
                break;
            default: // basic
                this.range = 200;
                this.damage = 15;
                this.fireRate = 1000;
                this.color = '#00d2ff'; // 네온 블루
                break;
        }
    }

    update(deltaTime, enemies, projectiles) {
        if (!this.isPowered) return; // 전기가 없으면 작동 중지
        const now = Date.now();

        // 타겟 찾기 (가장 가까운 적)
        if (!this.target || !this.target.active || this.dist(this.target) > this.range) {
            this.target = null;
            let minDist = this.range;
            for (const enemy of enemies) {
                const d = this.dist(enemy);
                if (d < minDist) {
                    minDist = d;
                    this.target = enemy;
                }
            }
        }

        if (this.target) {
            this.angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
            
            if (this.type === 'turret-tesla') {
                if (now - this.lastFireTime > this.fireRate) {
                    this.target.hp -= this.damage;
                    if (this.target.hp <= 0) this.target.active = false;
                    this.lastFireTime = now;
                }
            } else if (this.type === 'turret-flamethrower') {
                if (now - this.lastFireTime > this.fireRate) {
                    enemies.forEach(enemy => {
                        const d = this.dist(enemy);
                        if (d <= this.range) {
                            enemy.hp -= this.damage;
                            if (enemy.hp <= 0) enemy.active = false;
                        }
                    });
                    this.lastFireTime = now;
                }
            } else {
                if (now - this.lastFireTime > this.fireRate) {
                    this.fire(projectiles);
                    this.lastFireTime = now;
                }
            }
        }
    }

    fire(projectiles) {
        projectiles.push(new Projectile(this.x, this.y, this.target, this.damage, this.color));
    }

    drawLightning(ctx, startX, startY, length) {
        ctx.beginPath();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        let curX = startX;
        let curY = startY;
        ctx.moveTo(curX, curY);
        const segments = 5;
        const segLen = length / segments;
        for (let i = 0; i < segments; i++) {
            curX += segLen;
            curY += (Math.random() - 0.5) * 20;
            ctx.lineTo(curX, curY);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    drawFlames(ctx, startX, startY, length) {
        const particleCount = 15;
        for (let i = 0; i < particleCount; i++) {
            const dist = Math.random() * length;
            const spread = (dist / length) * 20;
            const size = (1 - dist / length) * 10 + 2;
            const px = startX + dist;
            const py = startY + (Math.random() - 0.5) * spread;
            const colors = ['#ff4500', '#ff8c00', '#ffd700'];
            ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
            ctx.globalAlpha = (1 - dist / length) * 0.8;
            ctx.beginPath();
            ctx.arc(px, py, size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;
    }

    dist(other) {
        return Math.hypot(this.x - other.x, this.y - other.y);
    }

    draw(ctx, showRange = false) {
        if (showRange) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2);
            ctx.strokeStyle = `${this.color}33`;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.fillStyle = `${this.color}0D`;
            ctx.fill();
            ctx.restore();
        }

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        ctx.fillStyle = '#333';
        ctx.fillRect(-15, -15, 30, 30);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(-15, -15, 30, 30);

        ctx.fillStyle = this.isPowered ? '#666' : '#222';
        if (this.type === 'turret-fast') {
            ctx.fillRect(0, -8, 15, 6);
            ctx.fillRect(0, 2, 15, 6);
        } else if (this.type === 'turret-sniper') {
            ctx.fillRect(0, -4, 30, 8);
            ctx.fillStyle = this.isPowered ? this.color : '#444';
            ctx.fillRect(25, -5, 5, 10);
        } else if (this.type === 'turret-tesla') {
            ctx.fillStyle = this.isPowered ? '#888' : '#333';
            ctx.fillRect(0, -10, 10, 20);
            for(let i=0; i<3; i++) {
                ctx.fillStyle = this.isPowered ? this.color : '#444';
                ctx.fillRect(10 + i*4, -12 + i*2, 2, 24 - i*4);
            }
            if (this.target && this.isPowered) {
                this.drawLightning(ctx, 15, 0, this.dist(this.target));
            }
        } else if (this.type === 'turret-flamethrower') {
            ctx.fillStyle = '#555';
            ctx.fillRect(0, -8, 20, 16);
            ctx.fillStyle = '#333';
            ctx.fillRect(18, -10, 4, 20);
            if (this.target && this.isPowered) {
                this.drawFlames(ctx, 22, 0, this.range);
            }
        } else {
            ctx.fillRect(0, -6, 20, 12);
        }

        if (!this.isPowered) {
            ctx.rotate(-this.angle);
            ctx.fillStyle = '#ff0';
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('⚡!', 0, 5);
        }

        ctx.restore();

        if (this.hp < this.maxHp) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(this.x - 15, this.y - 25, 30, 3);
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(this.x - 15, this.y - 25, (this.hp / this.maxHp) * 30, 3);
        }
    }
}

export class Generator extends Entity {
    constructor(x, y) {
        super(x, y);
        this.type = 'generator';
        this.size = 30;
        this.color = '#ffff00';
        this.maxHp = 80;
        this.hp = 80;
    }
}

export class PipeLine extends Entity {
    constructor(x, y) {
        super(x, y);
        this.type = 'pipe-line';
        this.maxHp = 80;
        this.hp = 80;
        this.size = 30;
        this.isConnected = false; // Whether connected to Base
    }

    update() {}

    draw(ctx, allEntities) {
        const neighbors = { n: null, s: null, e: null, w: null };
        if (allEntities) {
            allEntities.forEach(other => {
                if (other === this) return;
                const dx = other.x - this.x;
                const dy = other.y - this.y;
                const distSq = dx * dx + dy * dy;
                if (distSq > 30 * 30 && distSq < 50 * 50) {
                    // Pipes connect to pipes, base, or refineries
                    const pipeTransmitters = ['pipe-line', 'refinery', 'base'];
                    const isTransmitter = pipeTransmitters.includes(other.type) || (other.maxHp === 99999999);
                    if (isTransmitter) {
                        if (Math.abs(dx) < 5) {
                            if (dy < 0) neighbors.n = other; else neighbors.s = other;
                        } else if (Math.abs(dy) < 5) {
                            if (dx < 0) neighbors.w = other; else neighbors.e = other;
                        }
                    }
                }
            });
        }

        const isPipe = (n) => n && n.type === 'pipe-line';
        let pipeCount = 0;
        if (isPipe(neighbors.n)) pipeCount++;
        if (isPipe(neighbors.s)) pipeCount++;
        if (isPipe(neighbors.e)) pipeCount++;
        if (isPipe(neighbors.w)) pipeCount++;

        const points = (dir) => {
            if (isPipe(neighbors[dir])) return true;
            if (pipeCount === 0) return true;
            if (pipeCount === 1) {
                if (isPipe(neighbors.n) || isPipe(neighbors.s)) return dir === 'n' || dir === 's';
                if (isPipe(neighbors.e) || isPipe(neighbors.w)) return dir === 'e' || dir === 'w';
            }
            return isPipe(neighbors[dir]);
        };

        const finalNeighbors = {
            n: neighbors.n && points('n'),
            s: neighbors.s && points('s'),
            e: neighbors.e && points('e'),
            w: neighbors.w && points('w')
        };

        ctx.save();
        // Pipe Style: Thicker and industrial look
        ctx.lineWidth = 8;
        ctx.lineCap = 'butt';
        ctx.strokeStyle = '#555';
        const halfSize = 20;
        
        const drawSegment = (dirX, dirY) => {
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x + dirX * halfSize, this.y + dirY * halfSize);
            ctx.stroke();
            
            // Inner liquid flow line
            if (this.isConnected) {
                ctx.save();
                ctx.lineWidth = 4;
                ctx.strokeStyle = '#9370DB'; // Oil color
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(this.x + dirX * halfSize, this.y + dirY * halfSize);
                ctx.stroke();
                ctx.restore();
            }
        };

        if (finalNeighbors.n) drawSegment(0, -1);
        if (finalNeighbors.s) drawSegment(0, 1);
        if (finalNeighbors.w) drawSegment(-1, 0);
        if (finalNeighbors.e) drawSegment(1, 0);

        if (!finalNeighbors.n && !finalNeighbors.s && !finalNeighbors.w && !finalNeighbors.e) {
            ctx.fillStyle = '#555';
            ctx.beginPath(); ctx.arc(this.x, this.y, 6, 0, Math.PI * 2); ctx.fill();
        }

        // Joint/Valve
        ctx.fillStyle = '#444';
        ctx.beginPath(); ctx.arc(this.x, this.y, 5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
        
        if (this.hp < this.maxHp) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(this.x - 10, this.y - 15, 20, 3);
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(this.x - 10, this.y - 15, (this.hp / this.maxHp) * 20, 3);
        }
    }
}

export class Substation extends Entity {
    constructor(x, y) {
        super(x, y);
        this.type = 'substation';
        this.size = 30;
        this.maxHp = 100;
        this.hp = 100;
        this.isPowered = false;
        this.color = '#00ffcc';
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.fillStyle = '#333';
        ctx.fillRect(-12, -12, 24, 24);
        ctx.strokeStyle = this.isPowered ? this.color : '#555';
        ctx.lineWidth = 2;
        ctx.strokeRect(-12, -12, 24, 24);
        const coreHeight = 16;
        const chargeLevel = this.isPowered ? (Math.sin(Date.now() / 200) * 0.2 + 0.8) : 0.2;
        ctx.fillStyle = '#222';
        ctx.fillRect(-6, -8, 12, coreHeight);
        if (this.isPowered) {
            ctx.fillStyle = this.color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.color;
            const h = coreHeight * chargeLevel;
            ctx.fillRect(-6, 8 - h, 12, h);
        }
        ctx.fillStyle = '#666';
        ctx.fillRect(-3, -10, 6, 2);
        ctx.restore();

        if (this.hp < this.maxHp) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(this.x - 12, this.y - 20, 24, 3);
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(this.x - 12, this.y - 20, (this.hp / this.maxHp) * 24, 3);
        }
    }
}

export class Wall extends Entity {
    constructor(x, y) {
        super(x, y);
        this.type = 'wall';
        this.size = 30;
        this.maxHp = 500;
        this.hp = 500;
        this.color = '#888';
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(-15, -15, 30, 30);
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 2;
        ctx.strokeRect(-15, -15, 30, 30);
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-15, -5); ctx.lineTo(15, -5);
        ctx.moveTo(-15, 5); ctx.lineTo(15, 5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-5, -15); ctx.lineTo(-5, -5);
        ctx.moveTo(10, -15); ctx.lineTo(10, -5);
        ctx.moveTo(-10, -5); ctx.lineTo(-10, 5);
        ctx.moveTo(5, -5); ctx.lineTo(5, 5);
        ctx.moveTo(-5, 5); ctx.lineTo(-5, 15);
        ctx.moveTo(10, 5); ctx.lineTo(10, 15);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-14, -14); ctx.lineTo(14, -14);
        ctx.moveTo(-14, -14); ctx.lineTo(-14, 14);
        ctx.stroke();
        ctx.restore();

        if (this.hp < this.maxHp) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(this.x - 15, this.y - 25, 30, 3);
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(this.x - 15, this.y - 25, (this.hp / this.maxHp) * 30, 3);
        }
    }
}

export class CoalGenerator extends Generator {
    constructor(x, y) {
        super(x, y);
        this.type = 'coal-generator';
        this.color = '#ff6600';
        this.maxHp = 150;
        this.hp = 150;
        this.maxFuel = 50;
        this.fuel = 50;
    }

    update(deltaTime) {
        if (this.fuel > 0) {
            this.fuel -= deltaTime / 1000;
            if (this.fuel < 0) this.fuel = 0;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.fillStyle = '#444';
        ctx.fillRect(-15, -15, 30, 30);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(-15, -15, 30, 30);
        ctx.fillStyle = '#222';
        ctx.beginPath(); ctx.arc(0, -5, 10, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#666'; ctx.stroke();
        const flicker = (this.fuel > 0) ? ((Math.random() * 0.2) + 0.8) : 0;
        ctx.fillStyle = `rgba(255, 100, 0, ${flicker})`;
        ctx.beginPath(); ctx.arc(0, -5, 6, 0, Math.PI * 2); ctx.fill();
        if (this.fuel > 0) {
            ctx.fillStyle = 'rgba(100, 100, 100, 0.4)';
            const time = Date.now() / 1000;
            const smokeY = -20 - (time % 1) * 15;
            const smokeSize = 5 + (time % 1) * 5;
            ctx.beginPath(); ctx.arc(Math.sin(time * 2) * 3, smokeY, smokeSize, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();

        if (this.hp < this.maxHp) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(this.x - 15, this.y - 35, 30, 3);
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(this.x - 15, this.y - 35, (this.hp / this.maxHp) * 30, 3);
        }
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(this.x - 15, this.y - 25, 30, 4);
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(this.x - 15, this.y - 25, (this.fuel / this.maxFuel) * 30, 4);
    }
}

export class OilGenerator extends Generator {
    constructor(x, y) {
        super(x, y);
        this.type = 'oil-generator';
        this.color = '#9370DB';
        this.maxHp = 150;
        this.hp = 150;
        this.maxFuel = 80;
        this.fuel = 80;
    }

    update(deltaTime) {
        if (this.fuel > 0) {
            this.fuel -= deltaTime / 1000;
            if (this.fuel < 0) this.fuel = 0;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.fillStyle = '#333';
        ctx.fillRect(-15, -15, 30, 30);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(-15, -15, 30, 30);
        const gradient = ctx.createLinearGradient(-10, 0, 10, 0);
        gradient.addColorStop(0, '#555');
        gradient.addColorStop(0.5, '#777');
        gradient.addColorStop(1, '#555');
        ctx.fillStyle = gradient;
        ctx.beginPath(); ctx.roundRect(-12, -12, 24, 24, 5); ctx.fill();
        ctx.strokeStyle = '#222'; ctx.stroke();
        ctx.fillStyle = (this.fuel > 0) ? this.color : '#444';
        ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = this.color; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-18, 0); ctx.stroke();
        ctx.restore();

        if (this.hp < this.maxHp) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(this.x - 15, this.y - 35, 30, 3);
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(this.x - 15, this.y - 35, (this.hp / this.maxHp) * 30, 3);
        }
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(this.x - 15, this.y - 25, 30, 4);
        ctx.fillStyle = '#9370DB';
        ctx.fillRect(this.x - 15, this.y - 25, (this.fuel / this.maxFuel) * 30, 4);
    }
}

export class PowerLine extends Entity {
    constructor(x, y) {
        super(x, y);
        this.type = 'power-line';
        this.maxHp = 50;
        this.hp = 50;
        this.size = 30;
        this.isPowered = false;
    }

    update() {}

    draw(ctx, allEntities) {
        const neighbors = { n: null, s: null, e: null, w: null };
        if (allEntities) {
            allEntities.forEach(other => {
                if (other === this) return;
                const dx = other.x - this.x;
                const dy = other.y - this.y;
                const distSq = dx * dx + dy * dy;
                if (distSq > 30 * 30 && distSq < 50 * 50) {
                    const transmitterTypes = ['power-line', 'generator', 'coal-generator', 'oil-generator', 'substation', 'base', 'airport', 'refinery'];
                    const isTransmitter = transmitterTypes.includes(other.type) || (other.maxHp === 99999999);
                    if (isTransmitter) {
                        if (Math.abs(dx) < 5) {
                            if (dy < 0) neighbors.n = other; else neighbors.s = other;
                        } else if (Math.abs(dy) < 5) {
                            if (dx < 0) neighbors.w = other; else neighbors.e = other;
                        }
                    }
                }
            });
        }

        const isWire = (n) => n && n.type === 'power-line';
        let wireCount = 0;
        if (isWire(neighbors.n)) wireCount++;
        if (isWire(neighbors.s)) wireCount++;
        if (isWire(neighbors.e)) wireCount++;
        if (isWire(neighbors.w)) wireCount++;

        const points = (dir) => {
            if (isWire(neighbors[dir])) return true;
            if (wireCount === 0) return true;
            if (wireCount === 1) {
                if (isWire(neighbors.n) || isWire(neighbors.s)) return dir === 'n' || dir === 's';
                if (isWire(neighbors.e) || isWire(neighbors.w)) return dir === 'e' || dir === 'w';
            }
            return isWire(neighbors[dir]);
        };

        const finalNeighbors = {
            n: neighbors.n && points('n'),
            s: neighbors.s && points('s'),
            e: neighbors.e && points('e'),
            w: neighbors.w && points('w')
        };

        ctx.save();
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.strokeStyle = this.isPowered ? '#ffff00' : '#444';
        const halfSize = 20;
        if (finalNeighbors.n) { ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.x, this.y - halfSize); ctx.stroke(); }
        if (finalNeighbors.s) { ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.x, this.y + halfSize); ctx.stroke(); }
        if (finalNeighbors.w) { ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.x - halfSize, this.y); ctx.stroke(); }
        if (finalNeighbors.e) { ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.x + halfSize, this.y); ctx.stroke(); }

        if (!finalNeighbors.n && !finalNeighbors.s && !finalNeighbors.w && !finalNeighbors.e) {
            ctx.fillStyle = this.isPowered ? '#ffff00' : '#444';
            ctx.beginPath(); ctx.arc(this.x, this.y, 3, 0, Math.PI * 2); ctx.fill();
        }

        if (this.isPowered) {
            ctx.fillStyle = '#ffff00';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ffff00';
            ctx.beginPath(); ctx.arc(this.x, this.y, 2, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
        
        if (this.hp < this.maxHp) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(this.x - 10, this.y - 15, 20, 3);
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(this.x - 10, this.y - 15, (this.hp / this.maxHp) * 20, 3);
        }
    }
}

export class Refinery extends Entity {
    constructor(x, y) {
        super(x, y);
        this.type = 'refinery';
        this.size = 30;
        this.maxHp = 200;
        this.hp = 200;
        this.maxFuel = 80;
        this.fuel = 80;
        this.productionRate = 5;
        this.color = '#32cd32';
        this.isConnected = false; // Connection to base via pipe
    }

    update(deltaTime, engine) {
        if (this.fuel > 0 && this.isConnected) {
            this.fuel -= deltaTime / 1000;
            if (this.fuel < 0) this.fuel = 0;
            
            // 정제유 생산 (기지에 연결되었을 때만)
            engine.resources.oil += (this.productionRate * deltaTime / 1000);
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.fillStyle = '#333';
        ctx.fillRect(-15, -15, 30, 30);
        ctx.strokeStyle = (this.fuel > 0) ? this.color : '#555';
        ctx.lineWidth = 2;
        ctx.strokeRect(-15, -15, 30, 30);
        ctx.fillStyle = '#555';
        ctx.fillRect(-10, -10, 8, 20);
        ctx.fillRect(2, -10, 8, 20);
        ctx.strokeStyle = '#777'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(2, 0); ctx.stroke();
        if (this.fuel > 0) {
            const liquidHeight = (this.fuel / this.maxFuel) * 18;
            ctx.fillStyle = '#9370DB'; ctx.fillRect(-9, 9 - liquidHeight, 6, liquidHeight);
            ctx.fillStyle = '#ffd700'; ctx.fillRect(3, 9 - liquidHeight, 6, liquidHeight);
        }
        ctx.restore();

        if (this.hp < this.maxHp) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(this.x - 15, this.y - 35, 30, 3);
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(this.x - 15, this.y - 35, (this.hp / this.maxHp) * 30, 3);
        }
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(this.x - 15, this.y - 25, 30, 4);
        ctx.fillStyle = '#32cd32';
        ctx.fillRect(this.x - 15, this.y - 25, (this.fuel / this.maxFuel) * 30, 4);
    }
}

export class Airport extends Entity {
    constructor(x, y) {
        super(x, y);
        this.type = 'airport';
        this.width = 80;
        this.height = 120;
        this.size = 80;
        this.maxHp = 2000;
        this.hp = 2000;
        this.color = '#aaaaaa';
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(-40, -60, 80, 120);
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 2;
        ctx.strokeRect(-40, -60, 80, 120);
        ctx.fillStyle = '#1a1c23';
        ctx.fillRect(-10, -55, 20, 110);
        ctx.strokeStyle = '#ffff00';
        ctx.setLineDash([10, 10]);
        ctx.beginPath(); ctx.moveTo(0, -50); ctx.lineTo(0, 50); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#444';
        ctx.fillRect(-35, -20, 25, 50);
        ctx.strokeStyle = '#888'; ctx.strokeRect(-35, -20, 25, 50);
        ctx.fillStyle = '#666';
        ctx.fillRect(15, -40, 15, 15);
        ctx.fillStyle = '#00d2ff';
        ctx.shadowBlur = 5; ctx.shadowColor = '#00d2ff';
        ctx.fillRect(17, -38, 11, 5);
        ctx.shadowBlur = 0;
        ctx.restore();

        if (this.hp < this.maxHp) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(this.x - 30, this.y - 75, 60, 5);
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(this.x - 30, this.y - 75, (this.hp / this.maxHp) * 60, 5);
        }
    }
}

export class ScoutPlane extends Entity {
    constructor(startX, startY, targetX, targetY, engine) {
        super(startX, startY);
        this.engine = engine;
        this.targetX = targetX;
        this.targetY = targetY;
        this.speed = 5;
        this.angle = Math.atan2(targetY - startY, targetX - startX);
        this.arrived = false;
        this.revealRadius = 8;
        this.alive = true;
        this.returning = false;
        this.homeX = startX;
        this.homeY = startY;
    }

    update(deltaTime) {
        if (!this.alive) return;
        const tx = this.returning ? this.homeX : this.targetX;
        const ty = this.returning ? this.homeY : this.targetY;
        const d = Math.hypot(tx - this.x, ty - this.y);
        if (d < 10) {
            if (!this.returning) {
                this.revealFog();
                this.returning = true;
                this.angle = Math.atan2(this.homeY - this.y, this.homeX - this.x);
            } else {
                this.alive = false;
            }
        } else {
            this.x += Math.cos(this.angle) * this.speed;
            this.y += Math.sin(this.angle) * this.speed;
        }
    }

    revealFog() {
        const radius = this.revealRadius;
        const grid = this.engine.tileMap.worldToGrid(this.x, this.y);
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const nx = grid.x + dx;
                const ny = grid.y + dy;
                if (nx >= 0 && nx < this.engine.tileMap.cols && ny >= 0 && ny < this.engine.tileMap.rows) {
                    if (dx * dx + dy * dy <= radius * radius) {
                        this.engine.tileMap.grid[ny][nx].visible = true;
                    }
                }
            }
        }
    }

    draw(ctx) {
        if (!this.alive) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(-10, -6);
        ctx.lineTo(-6, 0);
        ctx.lineTo(-10, 6);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(-2, -12, 4, 24);
        ctx.restore();
    }
}

export class Enemy extends Entity {
    constructor(x, y, wave) {
        super(x, y);
        this.speed = 1.5 + (wave * 0.15);
        this.maxHp = 20 + (wave * 10);
        this.hp = this.maxHp;
        this.size = 20;
        this.damage = 5 + (wave * 2);
        this.attackRange = 35;
        this.attackInterval = 1000;
        this.lastAttackTime = 0;
        this.currentTarget = null;
    }

    update(deltaTime, base, buildings) {
        if (!base) return;
        const now = Date.now();
        const angleToBase = Math.atan2(base.y - this.y, base.x - this.x);
        let nextX = this.x + Math.cos(angleToBase) * this.speed;
        let nextY = this.y + Math.sin(angleToBase) * this.speed;
        let blockedBy = null;
        const distToBase = Math.hypot(this.x - base.x, this.y - base.y);
        if (distToBase <= this.attackRange) {
            blockedBy = base;
        } else {
            for (const obs of buildings) {
                if (['ore', 'coal', 'oil', 'power-line'].includes(obs.type)) continue;
                if (obs === base) continue;
                const dNext = Math.hypot(nextX - obs.x, nextY - obs.y);
                const minDist = (this.size / 2) + (obs.size / 2) + 2;
                if (dNext < minDist) {
                    blockedBy = obs;
                    break;
                }
            }
        }
        if (!blockedBy) {
            this.x = nextX;
            this.y = nextY;
            this.currentTarget = base;
        } else {
            this.currentTarget = blockedBy;
        }
        if (this.currentTarget && this.currentTarget.active && this.currentTarget.hp > 0) {
            const attackDist = Math.hypot(this.x - this.currentTarget.x, this.y - this.currentTarget.y);
            const rangeThreshold = (this.currentTarget === base) ? this.attackRange + 5 : (this.size/2 + this.currentTarget.size/2 + 5);
            if (attackDist <= rangeThreshold) {
                if (now - this.lastAttackTime > this.attackInterval) {
                    this.currentTarget.hp -= this.damage;
                    this.lastAttackTime = now;
                    if (this.currentTarget === base && this.currentTarget.hp <= 0) {
                        this.currentTarget.active = false;
                    }
                }
            }
        }
    }

    draw(ctx) {
        ctx.fillStyle = '#ff3131';
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2); ctx.fill();
        const barY = this.y + this.size / 2 + 5;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(this.x - 10, barY, 20, 3);
        ctx.fillStyle = '#ff3131';
        ctx.fillRect(this.x - 10, barY, (this.hp / this.maxHp) * 20, 3);
    }
}

export class Projectile extends Entity {
    constructor(x, y, target, damage, color = '#ffff00') {
        super(x, y);
        this.target = target;
        this.damage = damage;
        this.color = color;
        this.speed = 8;
        this.size = 6;
    }

    update(deltaTime) {
        if (!this.target || !this.target.active) {
            this.active = false;
            return;
        }
        const angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
        this.x += Math.cos(angle) * this.speed;
        this.y += Math.sin(angle) * this.speed;
        if (Math.hypot(this.x - this.target.x, this.y - this.target.y) < 15) {
            this.target.hp -= this.damage;
            if (this.target.hp <= 0) this.target.active = false;
            this.active = false;
        }
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10; ctx.shadowColor = this.color;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
    }
}

export class Resource extends Entity {
    constructor(x, y, type = 'ore') {
        super(x, y);
        this.type = type;
        this.size = 25;
        this.initType();
    }

    initType() {
        switch (this.type) {
            case 'coal': this.color = '#333333'; this.name = '석탄'; break;
            case 'oil': this.color = '#2F4F4F'; this.name = '석유'; break;
            default: this.color = '#778899'; this.name = '자원'; break;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.fillStyle = this.color;
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3;
            const px = Math.cos(angle) * (this.size / 2);
            const py = Math.sin(angle) * (this.size / 2);
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.restore();
    }
}