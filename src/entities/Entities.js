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
        this.type = 'generator';
        this.size = 30;
        this.color = '#ffff00'; // 전기색 (노랑)
        this.maxHp = 80;
        this.hp = 80;
    }

    update() {
        // 발전기는 별도 타겟팅 불필요
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

        // Core (애니메이션 느낌)
        const pulse = Math.sin(Date.now() / 200) * 5;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10 + pulse;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, 8 + pulse / 2, 0, Math.PI * 2);
        ctx.fill();

        // Electricity Effect
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(Date.now() / 100 + i * Math.PI / 2) * 20, Math.sin(Date.now() / 100 + i * Math.PI / 2) * 20);
            ctx.stroke();
        }

        ctx.restore();

        // HP Bar
        if (this.hp < this.maxHp) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(this.x - 15, this.y + 18, 30, 3);
            ctx.fillStyle = '#ffff00';
            ctx.fillRect(this.x - 15, this.y + 18, (this.hp / this.maxHp) * 30, 3);
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

        // 1. 기지 방향으로 이동 시도 (언제나 기지 진격이 최우선)
        const angleToBase = Math.atan2(base.y - this.y, base.x - this.x);
        let nextX = this.x + Math.cos(angleToBase) * this.speed;
        let nextY = this.y + Math.sin(angleToBase) * this.speed;

        const allObstacles = [base, ...buildings];
        let blockedBy = null;
        const distToBase = Math.hypot(this.x - base.x, this.y - base.y);

        // 기지 사거리 밖일 경우에만 이동 및 충돌 체크 실행
        if (distToBase > this.attackRange) {
            for (const obs of allObstacles) {
                if (obs === base) continue;
                const dNext = Math.hypot(nextX - obs.x, nextY - obs.y);
                const minDist = (this.size / 2) + (obs.size / 2) + 2;

                if (dNext < minDist) {
                    // 기지 경로가 막힘 -> 슬라이딩 회피 시도
                    const angleToObs = Math.atan2(obs.y - this.y, obs.x - this.x);
                    const diff = angleToBase - angleToObs;
                    const slideAngle = angleToObs + (Math.PI / 2) * (Math.sin(diff) > 0 ? 1 : -1);

                    const slideX = this.x + Math.cos(slideAngle) * this.speed;
                    const slideY = this.y + Math.sin(slideAngle) * this.speed;

                    // 회피 시도한 위치가 또 다른 장애물과 충돌하는지 체크
                    let canSlide = true;
                    for (const other of allObstacles) {
                        if (other === obs) continue;
                        if (Math.hypot(slideX - other.x, slideY - other.y) < (this.size / 2) + (other.size / 2) + 2) {
                            canSlide = false;
                            break;
                        }
                    }

                    if (canSlide) {
                        nextX = slideX;
                        nextY = slideY;
                    } else {
                        // 완전히 가로막힘 -> 가로막은 오브젝트를 공격 타겟으로 설정
                        blockedBy = obs;
                        break;
                    }
                }
            }

            if (!blockedBy) {
                // 전진 경로가 확보됨
                this.x = nextX;
                this.y = nextY;
                this.currentTarget = base;
            } else {
                // 길이 막힘
                this.currentTarget = blockedBy;
            }
        } else {
            // 기지에 인접함
            this.currentTarget = base;
        }

        // 2. 공격 실행 (현재 타겟이 사거리 내에 있을 때)
        if (this.currentTarget && this.currentTarget.active && this.currentTarget.hp > 0) {
            const attackDist = Math.hypot(this.x - this.currentTarget.x, this.y - this.currentTarget.y);
            if (attackDist <= this.attackRange + 5) {
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
                this.color = '#111111';
                this.name = '석유';
                break;
            default:
                this.color = '#778899';
                this.name = '광석';
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
