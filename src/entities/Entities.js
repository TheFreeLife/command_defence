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
        this.maxHp = 1000;
        this.hp = 1000;
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

        // HP Bar
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(this.x - 20, this.y + 25, 40, 5);
        ctx.fillStyle = '#00d2ff';
        ctx.fillRect(this.x - 20, this.y + 25, (this.hp / this.maxHp) * 40, 5);
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
            if (now - this.lastFireTime > this.fireRate) {
                this.fire(projectiles);
                this.lastFireTime = now;
            }
        }
    }

    fire(projectiles) {
        projectiles.push(new Projectile(this.x, this.y, this.target, this.damage, this.color));
    }

    dist(other) {
        return Math.hypot(this.x - other.x, this.y - other.y);
    }

    draw(ctx) {
        // Range Circle
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2);
        ctx.strokeStyle = `${this.color}33`; // 투명도 추가
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.fillStyle = `${this.color}0D`;
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Base
        ctx.fillStyle = '#333';
        ctx.fillRect(-15, -15, 30, 30);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(-15, -15, 30, 30);

        // Barrel
        ctx.fillStyle = this.isPowered ? '#666' : '#222'; // 비활성 시 어둡게
        if (this.type === 'turret-fast') {
            ctx.fillRect(0, -8, 15, 6);
            ctx.fillRect(0, 2, 15, 6);
        } else if (this.type === 'turret-sniper') {
            ctx.fillRect(0, -4, 30, 8);
            ctx.fillStyle = this.isPowered ? this.color : '#444';
            ctx.fillRect(25, -5, 5, 10);
        } else {
            ctx.fillRect(0, -6, 20, 12);
        }

        // 전력이 없을 때 경고 표시
        if (!this.isPowered) {
            ctx.rotate(-this.angle); // 각도 복구
            ctx.fillStyle = '#ff0';
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('⚡!', 0, 5);
        }

        ctx.restore();

        // HP Bar
        if (this.hp < this.maxHp) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(this.x - 15, this.y + 18, 30, 3);
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(this.x - 15, this.y + 18, (this.hp / this.maxHp) * 30, 3);
        }
    }
}

export class Generator extends Entity {
    constructor(x, y) {
        super(x, y);
        this.type = 'generator'; // Base type
        this.size = 30;
        this.color = '#ffff00';
        this.maxHp = 80;
        this.hp = 80;
    }
    // 기본 Generator의 draw/update는 상속용으로 둠
}

export class PowerLine extends Entity {
    constructor(x, y) {
        super(x, y);
        this.type = 'power-line';
        this.maxHp = 50;
        this.hp = 50;
        this.size = 30; // 타일 크기와 비슷하게
        this.isPowered = false;
    }

    update() {}

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        const color = this.isPowered ? '#ffff00' : '#555';
        const glow = this.isPowered ? 10 : 0;

        // Pole Base
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();

        // Core / Light
        ctx.fillStyle = color;
        ctx.shadowBlur = glow;
        ctx.shadowColor = color;
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
        
        // HP Bar (Only if damaged)
        if (this.hp < this.maxHp) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(this.x - 10, this.y + 10, 20, 3);
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(this.x - 10, this.y + 10, (this.hp / this.maxHp) * 20, 3);
        }
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

        // 1. 기지 방향으로 이동 계산
        const angleToBase = Math.atan2(base.y - this.y, base.x - this.x);
        let nextX = this.x + Math.cos(angleToBase) * this.speed;
        let nextY = this.y + Math.sin(angleToBase) * this.speed;

        // 2. 공격 대상(건물, 기지)과의 충돌 체크 (자원은 무시)
        let blockedBy = null;
        const distToBase = Math.hypot(this.x - base.x, this.y - base.y);

        if (distToBase <= this.attackRange) {
            blockedBy = base;
        } else {
            for (const obs of buildings) {
                // 자원(Resource)은 충돌 체크에서 제외 -> 통과
                if (['ore', 'coal', 'oil'].includes(obs.type)) continue;
                if (obs === base) continue;

                // 이동할 위치에 건물이 있는지 확인
                const dNext = Math.hypot(nextX - obs.x, nextY - obs.y);
                const minDist = (this.size / 2) + (obs.size / 2) + 2;

                if (dNext < minDist) {
                    blockedBy = obs;
                    break;
                }
            }
        }

        if (!blockedBy) {
            // 길 안 막힘: 이동
            this.x = nextX;
            this.y = nextY;
            this.currentTarget = base;
        } else {
            // 길 막힘(건물): 공격
            this.currentTarget = blockedBy;
        }

        // 3. 공격 실행
        if (this.currentTarget && this.currentTarget.active && this.currentTarget.hp > 0) {
            const attackDist = Math.hypot(this.x - this.currentTarget.x, this.y - this.currentTarget.y);
            
            // 건물은 충돌 크기 기반, 기지는 사거리 기반
            const rangeThreshold = (this.currentTarget === base) 
                ? this.attackRange + 5 
                : (this.size/2 + this.currentTarget.size/2 + 5);

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
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
        ctx.fill();

        // HP Bar (몬스터 아래로 이동)
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
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
        ctx.fill();
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
            case 'coal':
                this.color = '#333333';
                this.name = '석탄';
                break;
            case 'oil':
                this.color = '#2F4F4F'; // Dark Slate Gray (원유)
                this.name = '석유';
                break;
            default:
                this.color = '#778899';
                this.name = '자원';
                break;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // 중립 오브젝트 스타일 (육각형 느낌)
        ctx.fillStyle = this.color;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;

        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3;
            const px = Math.cos(angle) * (this.size / 2);
            const py = Math.sin(angle) * (this.size / 2);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }
}

export class CoalGenerator extends Generator {
    constructor(x, y) {
        super(x, y);
        this.type = 'coal-generator';
        this.color = '#ff6600'; // 주황색 (화력)
        this.maxHp = 150;
        this.hp = 150;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Base (Industrial Gray)
        ctx.fillStyle = '#444';
        ctx.fillRect(-15, -15, 30, 30);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(-15, -15, 30, 30);

        // Chimney
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(0, -5, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#666';
        ctx.stroke();

        // Fire Core
        const flicker = (Math.random() * 0.2) + 0.8;
        ctx.fillStyle = `rgba(255, 100, 0, ${flicker})`;
        ctx.beginPath();
        ctx.arc(0, -5, 6, 0, Math.PI * 2);
        ctx.fill();

        // Smoke Effect
        ctx.fillStyle = 'rgba(100, 100, 100, 0.4)';
        const time = Date.now() / 1000;
        const smokeY = -20 - (time % 1) * 15;
        const smokeSize = 5 + (time % 1) * 5;
        ctx.beginPath();
        ctx.arc(Math.sin(time * 2) * 3, smokeY, smokeSize, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // HP Bar
        if (this.hp < this.maxHp) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(this.x - 15, this.y + 18, 30, 3);
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(this.x - 15, this.y + 18, (this.hp / this.maxHp) * 30, 3);
        }
    }
}

export class OilGenerator extends Generator {
    constructor(x, y) {
        super(x, y);
        this.type = 'oil-generator';
        this.color = '#9370DB'; // 보라색
        this.maxHp = 150;
        this.hp = 150;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Base
        ctx.fillStyle = '#333';
        ctx.fillRect(-15, -15, 30, 30);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(-15, -15, 30, 30);

        // Tank Structure (Cylindrical look)
        const gradient = ctx.createLinearGradient(-10, 0, 10, 0);
        gradient.addColorStop(0, '#555');
        gradient.addColorStop(0.5, '#777');
        gradient.addColorStop(1, '#555');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(-12, -12, 24, 24, 5);
        ctx.fill();
        ctx.strokeStyle = '#222';
        ctx.stroke();

        // Pipes/Valves
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2); // Top valve
        ctx.fill();
        
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-12, 0);
        ctx.lineTo(-18, 0); // Side pipe
        ctx.stroke();

        ctx.restore();

        // HP Bar
        if (this.hp < this.maxHp) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(this.x - 15, this.y + 18, 30, 3);
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(this.x - 15, this.y + 18, (this.hp / this.maxHp) * 30, 3);
        }
    }
}
