import { TileMap } from '../map/TileMap.js';
import { Base, Turret, Enemy, Projectile, Generator, Resource } from '../entities/Entities.js';
import { WaveManager, UpgradeManager } from '../systems/GameSystems.js';

export class GameEngine {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.minimapCanvas = document.getElementById('minimapCanvas');
        this.minimapCtx = this.minimapCanvas.getContext('2d');

        this.resize();

        this.entityClasses = { Base, Turret, Enemy, Projectile, Generator };
        this.tileMap = new TileMap(this.canvas);

        const basePos = this.tileMap.gridToWorld(this.tileMap.centerX, this.tileMap.centerY);
        this.entities = {
            enemies: [],
            turrets: [],
            projectiles: [],
            generators: [],
            resources: [],
            base: new Base(basePos.x, basePos.y)
        };

        this.initResources();

        this.resources = { gold: 10000 };
        this.globalStats = { damage: 10, range: 150, fireRate: 1000 };
        this.waveManager = new WaveManager(this);
        this.upgradeManager = new UpgradeManager(this);

        this.lastTime = 0;
        this.gameState = 'playing'; // playing, upgrading, gameOver
        this.selectedBuildType = null;
        this.isBuildMode = false;

        // Camera State - 중앙 기지에 맞게 초기 위치 설정
        const baseWorldPos = this.entities.base;
        this.camera = {
            x: this.canvas.width / 2 - baseWorldPos.x,
            y: this.canvas.height / 2 - baseWorldPos.y,
            zoom: 0.8, // 전장을 더 넓게 보도록 약간 축소
            isDragging: false,
            lastMouseX: 0,
            lastMouseY: 0,
            mouseX: 0,
            mouseY: 0,
            edgeScrollSpeed: 15,
            edgeThreshold: 30 // 화면 끝 30px 이내면 스크롤
        };

        window.addEventListener('resize', () => this.resize());
        this.initInput();
        this.initUI();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        // 미니맵 사이즈는 고정 혹은 CSS에 비례
        this.minimapCanvas.width = 200;
        this.minimapCanvas.height = 200;
    }

    initResources() {
        const resourceTypes = ['ore', 'coal', 'oil'];
        const count = 50; // 전체 맵에 50개의 자원 배치

        for (let i = 0; i < count; i++) {
            let placed = false;
            while (!placed) {
                const rx = Math.floor(Math.random() * this.tileMap.cols);
                const ry = Math.floor(Math.random() * this.tileMap.rows);

                // 기지 주변(10칸 내외)에는 생성 안함
                const distToBase = Math.hypot(rx - this.tileMap.centerX, ry - this.tileMap.centerY);
                if (distToBase < 8) continue;

                const tile = this.tileMap.grid[ry][rx];
                if (tile.buildable && !tile.occupied) {
                    const pos = this.tileMap.gridToWorld(rx, ry);
                    const type = resourceTypes[Math.floor(Math.random() * resourceTypes.length)];
                    this.entities.resources.push(new Resource(pos.x, pos.y, type));
                    tile.occupied = true;
                    placed = true;
                }
            }
        }
    }

    initInput() {
        // Keyboard Input (ESC for canceling build mode)
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.cancelBuildMode();
            }
        });

        this.canvas.addEventListener('mousedown', (e) => {
            if (this.gameState !== 'playing') return;

            if (e.button === 0) { // 좌클릭: 드래그 시작
                this.camera.isDragging = true;
                this.camera.lastMouseX = e.clientX;
                this.camera.lastMouseY = e.clientY;
                this.camera.hasMoved = false;
            } else if (e.button === 2) { // 우클릭: 설치 모드일 때 즉시 설치
                if (this.isBuildMode) {
                    const rect = this.canvas.getBoundingClientRect();
                    const worldX = (e.clientX - rect.left - this.camera.x) / this.camera.zoom;
                    const worldY = (e.clientY - rect.top - this.camera.y) / this.camera.zoom;
                    this.handleInput(worldX, worldY);
                }
            }
        });

        window.addEventListener('mousemove', (e) => {
            this.camera.mouseX = e.clientX;
            this.camera.mouseY = e.clientY;

            if (this.camera.isDragging) {
                const dx = e.clientX - this.camera.lastMouseX;
                const dy = e.clientY - this.camera.lastMouseY;

                if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
                    this.camera.hasMoved = true;
                }

                this.camera.x += dx;
                this.camera.y += dy;
                this.camera.lastMouseX = e.clientX;
                this.camera.lastMouseY = e.clientY;
            }

            // 우클릭 연속 설치 (드래그 설치)
            if (e.buttons === 2 && this.isBuildMode) {
                const rect = this.canvas.getBoundingClientRect();
                const worldX = (e.clientX - rect.left - this.camera.x) / this.camera.zoom;
                const worldY = (e.clientY - rect.top - this.camera.y) / this.camera.zoom;
                this.handleInput(worldX, worldY);
            }
        });

        window.addEventListener('mouseup', (e) => {
            if (e.button === 0 && this.camera.isDragging) {
                if (!this.camera.hasMoved) {
                    const rect = this.canvas.getBoundingClientRect();
                    const screenX = e.clientX - rect.left;
                    const screenY = e.clientY - rect.top;

                    // 화면 좌표를 월드 좌표로 변환
                    const worldX = (screenX - this.camera.x) / this.camera.zoom;
                    const worldY = (screenY - this.camera.y) / this.camera.zoom;

                    if (this.isBuildMode) {
                        this.handleInput(worldX, worldY);
                    }
                }
                this.camera.isDragging = false;
            }
        });

        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomSpeed = 0.1;
            const delta = e.deltaY > 0 ? -zoomSpeed : zoomSpeed;
            const oldZoom = this.camera.zoom;
            this.camera.zoom = Math.min(Math.max(0.2, this.camera.zoom + delta), 3);

            // 마우스 커서 위치를 기준으로 확대/축소
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const worldX = (mouseX - this.camera.x) / oldZoom;
            const worldY = (mouseY - this.camera.y) / oldZoom;

            this.camera.x = mouseX - worldX * this.camera.zoom;
            this.camera.y = mouseY - worldY * this.camera.zoom;
        }, { passive: false });

        document.querySelectorAll('.build-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                if (!type) return;

                if (this.selectedBuildType === type && this.isBuildMode) {
                    this.cancelBuildMode();
                } else {
                    this.startBuildMode(type, btn);
                }
            });
        });

        // 미니맵 조작
        this.minimapCanvas.addEventListener('mousedown', (e) => this.handleMinimapInteraction(e));
        this.minimapCanvas.addEventListener('mousemove', (e) => {
            if (e.buttons === 1) this.handleMinimapInteraction(e);
        });

        // 우클릭 메뉴 방지
        window.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    startBuildMode(type, btn) {
        this.selectedBuildType = type;
        this.isBuildMode = true;
        document.querySelectorAll('.build-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.body.classList.add('build-mode-cursor');
    }

    cancelBuildMode() {
        this.isBuildMode = false;
        this.selectedBuildType = null;
        document.querySelectorAll('.build-btn').forEach(b => b.classList.remove('active'));
        document.body.classList.remove('build-mode-cursor');
    }

    initUI() {
        document.getElementById('restart-btn')?.addEventListener('click', () => location.reload());
    }

    handleMinimapInteraction(e) {
        const rect = this.minimapCanvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        const mapWorldWidth = this.tileMap.cols * this.tileMap.tileSize;
        const mapWorldHeight = this.tileMap.rows * this.tileMap.tileSize;

        const scaleX = this.minimapCanvas.width / mapWorldWidth;
        const scaleY = this.minimapCanvas.height / mapWorldHeight;
        const scale = Math.min(scaleX, scaleY);

        const offsetX = (this.minimapCanvas.width - mapWorldWidth * scale) / 2;
        const offsetY = (this.minimapCanvas.height - mapWorldHeight * scale) / 2;

        const worldX = (mx - offsetX) / scale;
        const worldY = (my - offsetY) / scale;

        this.camera.x = this.canvas.width / 2 - worldX * this.camera.zoom;
        this.camera.y = this.canvas.height / 2 - worldY * this.camera.zoom;
    }

    handleInput(worldX, worldY) {
        if (!this.isBuildMode || !this.selectedBuildType) return;

        const tileInfo = this.tileMap.getTileAt(worldX, worldY);

        // 타입별 비용 설정
        const costs = {
            'turret-basic': 50,
            'turret-fast': 80,
            'turret-sniper': 120,
            'generator': 150
        };
        const cost = costs[this.selectedBuildType] || 50;

        if (tileInfo && tileInfo.tile.buildable && !tileInfo.tile.occupied && this.resources.gold >= cost) {
            const pos = this.tileMap.gridToWorld(tileInfo.x, tileInfo.y);

            if (this.selectedBuildType === 'generator') {
                const { Generator } = this.entityClasses;
                this.entities.generators.push(new Generator(pos.x, pos.y));
            } else {
                const { Turret } = this.entityClasses;
                const turret = new Turret(pos.x, pos.y, this.selectedBuildType);
                turret.damage += (this.globalStats.damage - 10);
                turret.range += (this.globalStats.range - 150);
                this.entities.turrets.push(turret);
            }

            tileInfo.tile.occupied = true;
            this.resources.gold -= cost;
        }
    }

    onWaveComplete() {
        this.gameState = 'upgrading';
        const upgrades = this.upgradeManager.getRandomUpgrades(3);
        const container = document.getElementById('upgrade-cards');
        container.innerHTML = '';

        upgrades.forEach(upg => {
            const card = document.createElement('div');
            card.className = 'upgrade-card';
            card.innerHTML = `<h3>${upg.name}</h3><p>${upg.desc}</p>`;
            card.onclick = () => {
                upg.apply();
                document.getElementById('upgrade-modal').classList.add('hidden');
                this.gameState = 'playing';
                this.waveManager.startWave();
            };
            container.appendChild(card);
        });

        document.getElementById('upgrade-modal').classList.remove('hidden');
    }

    update(deltaTime) {
        if (this.gameState !== 'playing') return;

        this.updateEdgeScroll();
        this.updatePower();

        const now = Date.now();
        this.waveManager.update(now);

        // 건물 파괴 처리 및 타일 점유 해제
        const checkDestruction = (list) => {
            return list.filter(obj => {
                if (obj.hp <= 0) {
                    const grid = this.tileMap.worldToGrid(obj.x, obj.y);
                    if (this.tileMap.grid[grid.y] && this.tileMap.grid[grid.y][grid.x]) {
                        this.tileMap.grid[grid.y][grid.x].occupied = false;
                    }
                    return false;
                }
                return true;
            });
        };

        this.entities.turrets = checkDestruction(this.entities.turrets);
        this.entities.generators = checkDestruction(this.entities.generators);

        // 적 업데이트 및 필터링 (처치 시 자원 획득)
        this.entities.enemies = this.entities.enemies.filter(enemy => {
            if (!enemy.active && enemy.hp <= 0) {
                this.resources.gold += 10; // 적 처치 시 10골드 획득
            }
            return enemy.active;
        });

        const buildings = [...this.entities.turrets, ...this.entities.generators, ...this.entities.resources];
        this.entities.enemies.forEach(enemy => enemy.update(deltaTime, this.entities.base, buildings));
        this.entities.turrets.forEach(turret => turret.update(deltaTime, this.entities.enemies, this.entities.projectiles));
        this.entities.projectiles = this.entities.projectiles.filter(p => p.active);
        this.entities.projectiles.forEach(proj => proj.update(deltaTime));

        if (this.entities.base.hp <= 0) {
            this.gameState = 'gameOver';
            document.getElementById('game-over-modal').classList.remove('hidden');
        }

        document.getElementById('wave-count').textContent = this.waveManager.wave;
        document.getElementById('base-hp').textContent = Math.ceil(this.entities.base.hp);
        document.getElementById('resource-gold').textContent = this.resources.gold;
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        this.ctx.translate(this.camera.x, this.camera.y);
        this.ctx.scale(this.camera.zoom, this.camera.zoom);

        this.tileMap.draw();

        if (this.entities.base) this.entities.base.draw(this.ctx);
        this.entities.resources.forEach(r => r.draw(this.ctx));
        this.entities.generators.forEach(g => g.draw(this.ctx));
        this.entities.turrets.forEach(t => t.draw(this.ctx));
        this.entities.enemies.forEach(e => e.draw(this.ctx));
        this.entities.projectiles.forEach(p => p.draw(this.ctx));

        this.ctx.restore();

        // 미니맵 그리기
        this.renderMinimap();
    }

    renderMinimap() {
        const mCtx = this.minimapCtx;
        const mWidth = this.minimapCanvas.width;
        const mHeight = this.minimapCanvas.height;

        mCtx.clearRect(0, 0, mWidth, mHeight);

        const mapWorldWidth = this.tileMap.cols * this.tileMap.tileSize;
        const mapWorldHeight = this.tileMap.rows * this.tileMap.tileSize;

        const scaleX = mWidth / mapWorldWidth;
        const scaleY = mHeight / mapWorldHeight;
        const scale = Math.min(scaleX, scaleY);

        const offsetX = (mWidth - mapWorldWidth * scale) / 2;
        const offsetY = (mHeight - mapWorldHeight * scale) / 2;

        mCtx.save();
        mCtx.translate(offsetX, offsetY);
        mCtx.scale(scale, scale);

        // 배경
        mCtx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        mCtx.fillRect(0, 0, mapWorldWidth, mapWorldHeight);

        // 기지
        const base = this.entities.base;
        mCtx.fillStyle = '#00d2ff';
        mCtx.beginPath();
        mCtx.arc(base.x, base.y, 40, 0, Math.PI * 2);
        mCtx.fill();

        // 포탑
        mCtx.fillStyle = '#39ff14';
        this.entities.turrets.forEach(t => {
            mCtx.fillRect(t.x - 20, t.y - 20, 40, 40);
        });

        // 발전기
        mCtx.fillStyle = '#ffff00';
        this.entities.generators.forEach(g => {
            mCtx.fillRect(g.x - 20, g.y - 20, 40, 40);
        });

        // 자원
        this.entities.resources.forEach(r => {
            mCtx.fillStyle = r.color;
            mCtx.fillRect(r.x - 15, r.y - 15, 30, 30);
        });

        // 적
        mCtx.fillStyle = '#ff3131';
        this.entities.enemies.forEach(e => {
            mCtx.beginPath();
            mCtx.arc(e.x, e.y, 15, 0, Math.PI * 2);
            mCtx.fill();
        });

        // 현재 카메라 시야 표시
        const viewportW = this.canvas.width / this.camera.zoom;
        const viewportH = this.canvas.height / this.camera.zoom;
        const viewportX = -this.camera.x / this.camera.zoom;
        const viewportY = -this.camera.y / this.camera.zoom;

        mCtx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        mCtx.lineWidth = 10;
        mCtx.strokeRect(viewportX, viewportY, viewportW, viewportH);

        mCtx.restore();
    }

    updatePower() {
        // 모든 포탑의 전원 상태를 초기화
        this.entities.turrets.forEach(t => t.isPowered = false);

        // 발전기 주변의 포탑들에 전원 공급 (주위 1칸 = 약 1.5배 tileSize 거리 내)
        const powerRange = this.tileMap.tileSize * 1.5;

        this.entities.generators.forEach(gen => {
            this.entities.turrets.forEach(turret => {
                if (Math.abs(turret.x - gen.x) <= powerRange && Math.abs(turret.y - gen.y) <= powerRange) {
                    turret.isPowered = true;
                }
            });
        });

        // 기지 주변도 전원 공급 (기본 서비스)
        const base = this.entities.base;
        this.entities.turrets.forEach(turret => {
            if (Math.abs(turret.x - base.x) <= powerRange && Math.abs(turret.y - base.y) <= powerRange) {
                turret.isPowered = true;
            }
        });
    }

    updateEdgeScroll() {
        if (this.camera.isDragging) return;

        const { mouseX, mouseY, edgeThreshold, edgeScrollSpeed } = this.camera;
        const width = this.canvas.width;
        const height = this.canvas.height;
        let direction = '';

        if (mouseX < edgeThreshold) {
            this.camera.x += edgeScrollSpeed;
            direction += 'w';
        } else if (mouseX > width - edgeThreshold) {
            this.camera.x -= edgeScrollSpeed;
            direction += 'e';
        }

        if (mouseY < edgeThreshold) {
            this.camera.y += edgeScrollSpeed;
            direction = 'n' + direction;
        } else if (mouseY > height - edgeThreshold) {
            this.camera.y -= edgeScrollSpeed;
            direction = 's' + direction;
        }

        // 클래스 기반 커서 변경
        const scClasses = ['sc-n', 'sc-s', 'sc-e', 'sc-w', 'sc-ne', 'sc-nw', 'sc-se', 'sc-sw'];
        document.body.classList.remove(...scClasses);

        if (direction && !this.isBuildMode) {
            document.body.classList.add(`sc-${direction}`);
        }
    }

    loop(timestamp) {
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        this.update(deltaTime);
        this.render();

        requestAnimationFrame((t) => this.loop(t));
    }

    start() {
        this.waveManager.startWave();
        requestAnimationFrame((t) => this.loop(t));
    }
}
