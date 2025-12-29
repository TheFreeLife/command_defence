export class WaveManager {
    constructor(engine) {
        this.engine = engine;
        this.wave = 1;
        this.enemiesInWave = 10;
        this.spawnedCount = 0;
        this.lastSpawnTime = 0;
        this.spawnInterval = 2000; // ms
        this.isWaveActive = false;
    }

    startWave() {
        this.isWaveActive = true;
        this.spawnedCount = 0;
        this.enemiesInWave = 10 + (this.wave * 5);
        this.spawnInterval = Math.max(500, 2000 - (this.wave * 100));

        // 웨이브 알림 표시
        const notice = document.getElementById('wave-notice');
        if (notice) {
            notice.querySelector('.wave-text').textContent = `웨이브 ${this.wave} 시작`;
            notice.classList.remove('hidden');
            setTimeout(() => {
                notice.classList.add('hidden');
            }, 2000);
        }

        // 2초 대기 후 스폰 시작을 위해 lastSpawnTime 조정
        this.lastSpawnTime = Date.now() + 2000;
        console.log(`Wave ${this.wave} started with 2s delay!`);
    }

    update(now) {
        if (!this.isWaveActive) return;

        if (this.spawnedCount < this.enemiesInWave && now - this.lastSpawnTime > this.spawnInterval) {
            this.spawnEnemy();
            this.spawnedCount++;
            this.lastSpawnTime = now;
        }

        if (this.spawnedCount >= this.enemiesInWave && this.engine.entities.enemies.length === 0) {
            this.isWaveActive = false;
            this.wave++;
            this.engine.onWaveComplete();
        }
    }

    spawnEnemy() {
        // 전장(TileMap) 외곽에서 랜덤하게 생성
        const mapWidth = this.engine.tileMap.cols * this.engine.tileMap.tileSize;
        const mapHeight = this.engine.tileMap.rows * this.engine.tileMap.tileSize;

        const side = Math.floor(Math.random() * 4);
        let x, y;
        const padding = 20;

        if (side === 0) { // Top
            x = Math.random() * mapWidth;
            y = -padding;
        } else if (side === 1) { // Right
            x = mapWidth + padding;
            y = Math.random() * mapHeight;
        } else if (side === 2) { // Bottom
            x = Math.random() * mapWidth;
            y = mapHeight + padding;
        } else { // Left
            x = -padding;
            y = Math.random() * mapHeight;
        }

        const { Enemy } = this.engine.entityClasses;
        this.engine.entities.enemies.push(new Enemy(x, y, this.wave));
    }
}

export class UpgradeManager {
    constructor(engine) {
        this.engine = engine;
        this.upgrades = [
            { id: 'dmg', name: '공격력 강화', desc: '모든 포탑 데미지 +5', apply: () => this.engine.globalStats.damage += 5 },
            { id: 'range', name: '사거리 강화', desc: '모든 포탑 사거리 +20', apply: () => this.engine.globalStats.range += 20 },
            { id: 'speed', name: '재장전 가속', desc: '포탑 공격 주기 -100ms', apply: () => this.engine.globalStats.fireRate = Math.max(200, this.engine.globalStats.fireRate - 100) },
            { id: 'gold', name: '자원 지원', desc: '즉시 100 골드 획득', apply: () => this.engine.resources.gold += 100 },
            { id: 'base_hp', name: '기지 수리', desc: '기지 체력 200 회복', apply: () => this.engine.entities.base.hp = Math.min(this.engine.entities.base.maxHp, this.engine.entities.base.hp + 200) }
        ];
    }

    getRandomUpgrades(count = 3) {
        const shuffled = [...this.upgrades].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }
}
