import { TileMap } from '../map/TileMap.js';
import { Base, Turret, Enemy, Projectile, Generator, Resource, CoalGenerator, OilGenerator, PowerLine } from '../entities/Entities.js';
import { WaveManager, UpgradeManager } from '../systems/GameSystems.js';

export class GameEngine {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.minimapCanvas = document.getElementById('minimapCanvas');
        this.minimapCtx = this.minimapCanvas.getContext('2d');

        this.resize();

        this.entityClasses = { Base, Turret, Enemy, Projectile, Generator, CoalGenerator, OilGenerator, PowerLine };
        this.tileMap = new TileMap(this.canvas);

        const basePos = this.tileMap.gridToWorld(this.tileMap.centerX, this.tileMap.centerY);
        this.entities = {
            enemies: [],
            turrets: [],
            projectiles: [],
            generators: [],
            powerLines: [],
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

        // Camera State
        const baseWorldPos = this.entities.base;
        this.camera = {
            x: this.canvas.width / 2 - baseWorldPos.x,
            y: this.canvas.height / 2 - baseWorldPos.y,
            zoom: 0.8,
            isDragging: false,
            lastMouseX: 0,
            lastMouseY: 0,
            mouseX: 0,
            mouseY: 0,
            edgeScrollSpeed: 15,
            edgeThreshold: 30
        };

        window.addEventListener('resize', () => this.resize());
        this.initInput();
        this.initUI();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.minimapCanvas.width = 200;
        this.minimapCanvas.height = 200;
    }

    initResources() {
        const resourceTypes = ['coal', 'oil'];
        const numberOfVeins = 30; 

        for (let i = 0; i < numberOfVeins; i++) {
            let startX, startY;
            let validStart = false;
            let attempts = 0;

            while (!validStart && attempts < 100) {
                startX = Math.floor(Math.random() * (this.tileMap.cols - 4)) + 2;
                startY = Math.floor(Math.random() * (this.tileMap.rows - 4)) + 2;

                const distToBase = Math.hypot(startX - this.tileMap.centerX, startY - this.tileMap.centerY);
                if (distToBase > 15) {
                    validStart = true;
                }
                attempts++;
            }

            if (!validStart) continue;

            const currentVeinType = resourceTypes[Math.floor(Math.random() * resourceTypes.length)];
            const patternType = Math.random();

            if (patternType < 0.4) {
                this.generateBlob(startX, startY, currentVeinType);
            } else if (patternType < 0.7) {
                this.generateSnake(startX, startY, currentVeinType);
            } else {
                this.generateScatter(startX, startY, currentVeinType);
            }
        }
    }

    generateBlob(cx, cy, type) {
        const radius = 2; 
        for (let y = -radius; y <= radius; y++) {
            for (let x = -radius; x <= radius; x++) {
                if (x*x + y*y <= radius*radius + 0.5) {
                    if (Math.abs(x) <= 1 && Math.abs(y) <= 1 || Math.random() > 0.2) {
                        this.tryPlaceResource(cx + x, cy + y, type);
                    }
                }
            }
        }
    }

    generateSnake(startX, startY, type) {
        let x = startX;
        let y = startY;
        const length = 5 + Math.floor(Math.random() * 5);

        for (let i = 0; i < length; i++) {
            this.tryPlaceResource(x, y, type);
            const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
            const dir = dirs[Math.floor(Math.random() * dirs.length)];
            x += dir[0];
            y += dir[1];
        }
    }

    generateScatter(cx, cy, type) {
        const count = 6 + Math.floor(Math.random() * 4);
        for (let i = 0; i < count; i++) {
            const ox = Math.floor((Math.random() - 0.5) * 6);
            const oy = Math.floor((Math.random() - 0.5) * 6);
            this.tryPlaceResource(cx + ox, cy + oy, type);
        }
    }

    tryPlaceResource(x, y, type) {
        if (x >= 0 && x < this.tileMap.cols && y >= 0 && y < this.tileMap.rows) {
            const tile = this.tileMap.grid[y][x];
            const distToBase = Math.hypot(x - this.tileMap.centerX, y - this.tileMap.centerY);
            
            if (tile.buildable && !tile.occupied && distToBase > 12) {
                this.placeResource(x, y, type);
            }
        }
    }

    placeResource(x, y, type) {
        const pos = this.tileMap.gridToWorld(x, y);
        this.entities.resources.push(new Resource(pos.x, pos.y, type));
        this.tileMap.grid[y][x].occupied = true;
    }

    initUI() {
        document.getElementById('restart-btn')?.addEventListener('click', () => location.reload());
        this.updateBuildMenu('main');
    }

    getIconSVG(type) {
        const svgs = {
            'turret-basic': `<div class="btn-icon blue"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="12" fill="#333" stroke="#00d2ff" stroke-width="2"/><rect x="16" y="8" width="8" height="14" fill="#00d2ff"/></svg></div>`,
            'turret-fast': `<div class="btn-icon green"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="12" fill="#333" stroke="#39ff14" stroke-width="2"/><rect x="14" y="6" width="4" height="16" fill="#39ff14"/><rect x="22" y="6" width="4" height="16" fill="#39ff14"/></svg></div>`,
            'turret-sniper': `<div class="btn-icon red"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="12" fill="#333" stroke="#ff3131" stroke-width="2"/><rect x="18" y="2" width="4" height="20" fill="#ff3131"/><circle cx="20" cy="20" r="4" fill="none" stroke="#ff3131" stroke-width="2"/><line x1="20" y1="14" x2="20" y2="26" stroke="#ff3131" stroke-width="1"/><line x1="14" y1="20" x2="26" y2="20" stroke="#ff3131" stroke-width="1"/></svg></div>`,
            'coal-generator': `<div class="btn-icon orange"><svg viewBox="0 0 40 40"><rect x="10" y="20" width="20" height="15" fill="#333" stroke="#ff6600" stroke-width="2"/><rect x="22" y="10" width="6" height="12" fill="#333" stroke="#ff6600" stroke-width="2"/><circle cx="25" cy="8" r="3" fill="rgba(200,200,200,0.5)"/><circle cx="28" cy="4" r="4" fill="rgba(200,200,200,0.3)"/><path d="M15 28 Q20 20 25 28" stroke="#ff6600" stroke-width="2" fill="none"/></svg></div>`,
            'oil-generator': `<div class="btn-icon purple"><svg viewBox="0 0 40 40"><rect x="12" y="12" width="16" height="20" rx="3" fill="#333" stroke="#9370DB" stroke-width="2"/><path d="M12 16 L28 16" stroke="#9370DB" stroke-width="1"/><path d="M12 28 L28 28" stroke="#9370DB" stroke-width="1"/><circle cx="20" cy="12" r="4" fill="#333" stroke="#9370DB" stroke-width="2"/><path d="M8 20 L12 20" stroke="#9370DB" stroke-width="2"/></svg></div>`,
            'power-line': `<div class="btn-icon yellow"><svg viewBox="0 0 40 40"><line x1="20" y1="5" x2="20" y2="35" stroke="#ffff00" stroke-width="4"/><circle cx="20" cy="20" r="6" fill="#333" stroke="#ffff00" stroke-width="2"/></svg></div>`,
            'category-power': `<div class="btn-icon yellow"><svg viewBox="0 0 40 40"><path d="M10 20 L30 20 M20 10 L20 30" stroke="#ffff00" stroke-width="3"/><circle cx="20" cy="20" r="15" fill="none" stroke="#ffff00" stroke-width="2"/></svg></div>`,
            'back': `<div class="btn-icon"><svg viewBox="0 0 40 40"><path d="M25 10 L15 20 L25 30" stroke="#fff" stroke-width="3" fill="none"/></svg></div>`
        };
        return svgs[type] || '';
    }

    updateBuildMenu(menuName) {
        const grid = document.getElementById('build-grid');
        grid.innerHTML = '';

        const menus = {
            'main': [
                { type: 'turret-basic', name: 'Basic', cost: 50 },
                { type: 'turret-fast', name: 'Fast', cost: 80 },
                { type: 'turret-sniper', name: 'Sniper', cost: 120 },
                { type: 'power-line', name: 'Line', cost: 10 },
                { type: 'category-power', name: 'Plants', cost: null, action: 'menu:power' }
            ],
            'power': [
                { type: 'coal-generator', name: 'Coal', cost: 200 },
                { type: 'oil-generator', name: 'Oil', cost: 200 },
                null,
                null,
                null,
                { type: 'back', name: 'Back', cost: null, action: 'menu:main' }
            ]
        };

        const items = menus[menuName] || [];

        items.forEach(item => {
            if (!item) {
                const emptyDiv = document.createElement('div');
                grid.appendChild(emptyDiv);
                return;
            }

            const btn = document.createElement('button');
            btn.className = 'build-btn';
            if (item.action) {
                btn.dataset.action = item.action;
            } else {
                btn.dataset.type = item.type;
            }

            const iconHtml = this.getIconSVG(item.type);
            const costHtml = item.cost ? `<span class="btn-cost">${item.cost}G</span>` : '';
            
            btn.innerHTML = `
                ${iconHtml}
                <div class="btn-info">
                    <span class="btn-name">${item.name}</span>
                    ${costHtml}
                </div>
            `;
            grid.appendChild(btn);
        });
    }

    initInput() {
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.cancelBuildMode();
            }
        });

        const grid = document.getElementById('build-grid');
        grid.addEventListener('click', (e) => {
            const btn = e.target.closest('.build-btn');
            if (!btn) return;

            const action = btn.dataset.action;
            const type = btn.dataset.type;

            if (action) {
                if (action.startsWith('menu:')) {
                    const menuName = action.split(':')[1];
                    this.updateBuildMenu(menuName);
                }
            } else if (type) {
                if (this.selectedBuildType === type && this.isBuildMode) {
                    this.cancelBuildMode();
                } else {
                    this.startBuildMode(type, btn);
                }
            }
        });

        this.canvas.addEventListener('mousedown', (e) => {
            if (this.gameState !== 'playing') return;

            if (e.button === 0) {
                this.camera.isDragging = true;
                this.camera.lastMouseX = e.clientX;
                this.camera.lastMouseY = e.clientY;
                this.camera.hasMoved = false;
            } else if (e.button === 2) {
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

            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const worldX = (mouseX - this.camera.x) / oldZoom;
            const worldY = (mouseY - this.camera.y) / oldZoom;

            this.camera.x = mouseX - worldX * this.camera.zoom;
            this.camera.y = mouseY - worldY * this.camera.zoom;
        }, { passive: false });

        this.minimapCanvas.addEventListener('mousedown', (e) => this.handleMinimapInteraction(e));
        this.minimapCanvas.addEventListener('mousemove', (e) => {
            if (e.buttons === 1) this.handleMinimapInteraction(e);
        });

        window.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    startBuildMode(type, btn) {
        this.selectedBuildType = type;
        this.isBuildMode = true;
        document.querySelectorAll('.build-btn').forEach(b => b.classList.remove('active'));
        if(btn) btn.classList.add('active');
        document.body.classList.add('build-mode-cursor');
    }

    cancelBuildMode() {
        this.isBuildMode = false;
        this.selectedBuildType = null;
        document.querySelectorAll('.build-btn').forEach(b => b.classList.remove('active'));
        document.body.classList.remove('build-mode-cursor');
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
        if (!tileInfo) return;

        const costs = {
            'turret-basic': 50,
            'turret-fast': 80,
            'turret-sniper': 120,
            'power-line': 10,
            'coal-generator': 200,
            'oil-generator': 200
        };
        const cost = costs[this.selectedBuildType] || 50;

        if (this.resources.gold < cost) return;

        const pos = this.tileMap.gridToWorld(tileInfo.x, tileInfo.y);

        if (this.selectedBuildType === 'coal-generator') {
            const resourceIndex = this.entities.resources.findIndex(r => {
                return Math.abs(r.x - pos.x) < 5 && Math.abs(r.y - pos.y) < 5 && r.type === 'coal';
            });
            if (resourceIndex !== -1) {
                this.entities.resources.splice(resourceIndex, 1);
                const { CoalGenerator } = this.entityClasses;
                this.entities.generators.push(new CoalGenerator(pos.x, pos.y));
                tileInfo.tile.occupied = true;
                this.resources.gold -= cost;
            }
            return;
        }

        if (this.selectedBuildType === 'oil-generator') {
            const resourceIndex = this.entities.resources.findIndex(r => {
                return Math.abs(r.x - pos.x) < 5 && Math.abs(r.y - pos.y) < 5 && r.type === 'oil';
            });
            if (resourceIndex !== -1) {
                this.entities.resources.splice(resourceIndex, 1);
                const { OilGenerator } = this.entityClasses;
                this.entities.generators.push(new OilGenerator(pos.x, pos.y));
                tileInfo.tile.occupied = true;
                this.resources.gold -= cost;
            }
            return;
        }

        if (tileInfo.tile.buildable && !tileInfo.tile.occupied) {
            if (this.selectedBuildType === 'power-line') {
                const { PowerLine } = this.entityClasses;
                this.entities.powerLines.push(new PowerLine(pos.x, pos.y));
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
        this.entities.powerLines = checkDestruction(this.entities.powerLines);

        this.entities.enemies = this.entities.enemies.filter(enemy => {
            if (!enemy.active && enemy.hp <= 0) {
                this.resources.gold += 10;
            }
            return enemy.active;
        });

        const buildings = [...this.entities.turrets, ...this.entities.generators, ...this.entities.powerLines, ...this.entities.resources];
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
        this.entities.powerLines.forEach(pl => pl.draw(this.ctx));
        this.entities.generators.forEach(g => g.draw(this.ctx));
        this.entities.turrets.forEach(t => t.draw(this.ctx));
        this.entities.enemies.forEach(e => e.draw(this.ctx));
        this.entities.projectiles.forEach(p => p.draw(this.ctx));

        this.ctx.restore();
        this.renderTooltip();
        this.renderMinimap();
    }

    renderTooltip() {
        const worldX = (this.camera.mouseX - this.camera.x) / this.camera.zoom;
        const worldY = (this.camera.mouseY - this.camera.y) / this.camera.zoom;
        const hoveredResource = this.entities.resources.find(r => {
            return Math.hypot(r.x - worldX, r.y - worldY) < 15;
        });
        if (hoveredResource) {
            const text = hoveredResource.name;
            const x = this.camera.mouseX + 20;
            const y = this.camera.mouseY + 20;
            const padding = 8;
            const fontSize = 14;
            this.ctx.save();
            this.ctx.font = `bold ${fontSize}px Arial`;
            const metrics = this.ctx.measureText(text);
            const w = metrics.width;
            const h = fontSize;
            this.ctx.fillStyle = 'rgba(20, 20, 30, 0.9)';
            this.ctx.strokeStyle = hoveredResource.color;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            if (this.ctx.roundRect) { this.ctx.roundRect(x, y, w + padding * 2, h + padding * 2, 6); } else { this.ctx.rect(x, y, w + padding * 2, h + padding * 2); }
            this.ctx.fill();
            this.ctx.stroke();
            this.ctx.fillStyle = '#ffffff';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(text, x + padding, y + padding + h / 2 + 1);
            this.ctx.restore();
        }
    }

    renderMinimap() {
        const mCtx = this.minimapCtx;
        const mWidth = this.minimapCanvas.width;
        const mHeight = this.minimapCanvas.height;
        mCtx.clearRect(0, 0, mWidth, mHeight);
        const mapWorldWidth = this.tileMap.cols * this.tileMap.tileSize;
        const mapWorldHeight = this.tileMap.rows * this.tileMap.tileSize;
        const scale = Math.min(mWidth / mapWorldWidth, mHeight / mapWorldHeight);
        const offsetX = (mWidth - mapWorldWidth * scale) / 2;
        const offsetY = (mHeight - mapWorldHeight * scale) / 2;
        mCtx.save();
        mCtx.translate(offsetX, offsetY);
        mCtx.scale(scale, scale);
        mCtx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        mCtx.fillRect(0, 0, mapWorldWidth, mapWorldHeight);
        const base = this.entities.base;
        mCtx.fillStyle = '#00d2ff';
        mCtx.beginPath(); mCtx.arc(base.x, base.y, 40, 0, Math.PI * 2); mCtx.fill();
        mCtx.fillStyle = '#39ff14'; this.entities.turrets.forEach(t => mCtx.fillRect(t.x - 20, t.y - 20, 40, 40));
        mCtx.fillStyle = '#ffff00'; this.entities.generators.forEach(g => mCtx.fillRect(g.x - 20, g.y - 20, 40, 40));
        this.entities.resources.forEach(r => { mCtx.fillStyle = r.color; mCtx.fillRect(r.x - 15, r.y - 15, 30, 30); });
        mCtx.fillStyle = '#ff3131'; this.entities.enemies.forEach(e => { mCtx.beginPath(); mCtx.arc(e.x, e.y, 15, 0, Math.PI * 2); mCtx.fill(); });
        mCtx.restore();
    }

    updatePower() {
        // 1. 모든 전력 기기 초기화
        this.entities.turrets.forEach(t => t.isPowered = false);
        this.entities.powerLines.forEach(pl => pl.isPowered = false);

        // 2. BFS 탐색 준비
        // 그리드 좌표를 키("x,y")로 사용하여 엔티티 매핑
        const powerGrid = {};
        
        // 전선 매핑
        this.entities.powerLines.forEach(pl => {
            const gridPos = this.tileMap.worldToGrid(pl.x, pl.y);
            const key = `${gridPos.x},${gridPos.y}`;
            powerGrid[key] = pl;
        });

        // 탐색 큐 (발전소 및 기지에서 시작)
        const queue = [];
        const visited = new Set();

        const addSource = (x, y) => {
            const gridPos = this.tileMap.worldToGrid(x, y);
            const key = `${gridPos.x},${gridPos.y}`;
            queue.push(gridPos);
            visited.add(key);
        };

        this.entities.generators.forEach(g => addSource(g.x, g.y));
        addSource(this.entities.base.x, this.entities.base.y); // 기지도 전력원 역할

        // 3. BFS 전파
        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];

        while (queue.length > 0) {
            const curr = queue.shift();

            // 상하좌우 확인
            for (const dir of dirs) {
                const nx = curr.x + dir[0];
                const ny = curr.y + dir[1];
                const key = `${nx},${ny}`;

                // 3-1. 전선으로 연결되는지 확인
                if (powerGrid[key] && !visited.has(key)) {
                    powerGrid[key].isPowered = true;
                    visited.add(key);
                    queue.push({x: nx, y: ny});
                }
            }
        }

        // 4. 전선(혹은 발전소) 주변의 포탑 활성화
        // 모든 전원이 들어온 전선과 발전소를 다시 순회하여 인접 포탑 켬
        const activeSources = [
            ...this.entities.generators,
            ...this.entities.powerLines.filter(pl => pl.isPowered),
            this.entities.base
        ];

        // 최적화를 위해 활성 소스 위치들을 Set에 저장
        const activeSourceKeys = new Set();
        activeSources.forEach(s => {
            const gp = this.tileMap.worldToGrid(s.x, s.y);
            activeSourceKeys.add(`${gp.x},${gp.y}`);
        });

        this.entities.turrets.forEach(turret => {
            const gp = this.tileMap.worldToGrid(turret.x, turret.y);
            
            // 인접 4방향에 활성 전원(발전소, 기지, 켜진 전선)이 있는지 확인
            for (const dir of dirs) {
                const nx = gp.x + dir[0];
                const ny = gp.y + dir[1];
                if (activeSourceKeys.has(`${nx},${ny}`)) {
                    turret.isPowered = true;
                    break;
                }
            }
        });
    }

    updateEdgeScroll() {
        if (this.camera.isDragging) return;
        const { mouseX, mouseY, edgeThreshold, edgeScrollSpeed } = this.camera;
        const width = this.canvas.width;
        const height = this.canvas.height;
        let direction = '';
        if (mouseX < edgeThreshold) { this.camera.x += edgeScrollSpeed; direction += 'w'; }
        else if (mouseX > width - edgeThreshold) { this.camera.x -= edgeScrollSpeed; direction += 'e'; }
        if (mouseY < edgeThreshold) { this.camera.y += edgeScrollSpeed; direction = 'n' + direction; }
        else if (mouseY > height - edgeThreshold) { this.camera.y -= edgeScrollSpeed; direction = 's' + direction; }
        const scClasses = ['sc-n', 'sc-s', 'sc-e', 'sc-w', 'sc-ne', 'sc-nw', 'sc-se', 'sc-sw'];
        document.body.classList.remove(...scClasses);
        if (direction && !this.isBuildMode) { document.body.classList.add(`sc-${direction}`); }
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