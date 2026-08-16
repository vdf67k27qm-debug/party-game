// ==========================================
// パーティーゲーム - 疑似3Dアクションベース
// ==========================================

class MainScene extends Phaser.Scene {
    constructor() {
        super('MainScene');
    }

    preload() {
        // 外部画像は使わず、Graphicsで描画します
    }

    create() {
        // プレイヤーの状態を管理するオブジェクト
        this.player = {
            x: 0,
            z: 0,
            h: 0,
            vh: 0,
            isFalling: false,
            fallStartX: 0,
            fallStartZ: 0,
            inputX: 0,
            inputZ: 0
        };

        // 物理・操作の調整用パラメータ
        this.PHYSICS = {
            speed: 4,           // 移動速度
            gravity: 0.6,       // 重力
            jumpVelocity: 12,   // ジャンプの初速
            fieldSize: 200,     // フィールドのサイズ（中心からの半径）
            shadowOffset: 25    // 影を手前に表示するオフセット（値を大きくしてより手前に）
        };

        // --------------------------------------------------------
        // 1. 疑似3Dフィールドの描画（厚みのある土台）
        // --------------------------------------------------------
        const fieldGraphics = this.add.graphics();
        fieldGraphics.setDepth(-9999); // 常に一番奥（下）に描画

        const s = this.PHYSICS.fieldSize;
        const thickness = 50; // 土台の厚み

        // 上面の描画（明るい緑）
        fieldGraphics.fillStyle(0x7CFC00, 1);
        let p1 = this.worldToScreen(-s, -s, 0); // 左奥
        let p2 = this.worldToScreen(s, -s, 0);  // 右奥
        let p3 = this.worldToScreen(s, s, 0);   // 右手前
        let p4 = this.worldToScreen(-s, s, 0);  // 左手前

        fieldGraphics.beginPath();
        fieldGraphics.moveTo(p1.x, p1.y);
        fieldGraphics.lineTo(p2.x, p2.y);
        fieldGraphics.lineTo(p3.x, p3.y);
        fieldGraphics.lineTo(p4.x, p4.y);
        fieldGraphics.closePath();
        fieldGraphics.fillPath();

        // 側面の描画：前面（暗めの緑）
        fieldGraphics.fillStyle(0x556B2F, 1);
        let p3_bottom = this.worldToScreen(s, s, -thickness);
        let p4_bottom = this.worldToScreen(-s, s, -thickness);

        fieldGraphics.beginPath();
        fieldGraphics.moveTo(p3.x, p3.y);
        fieldGraphics.lineTo(p4.x, p4.y);
        fieldGraphics.lineTo(p4_bottom.x, p4_bottom.y);
        fieldGraphics.lineTo(p3_bottom.x, p3_bottom.y);
        fieldGraphics.closePath();
        fieldGraphics.fillPath();

        // 側面の描画：右側面（少し暗い緑）
        fieldGraphics.fillStyle(0x6B8E23, 1);
        let p2_bottom = this.worldToScreen(s, -s, -thickness);
        
        fieldGraphics.beginPath();
        fieldGraphics.moveTo(p2.x, p2.y);
        fieldGraphics.lineTo(p3.x, p3.y);
        fieldGraphics.lineTo(p3_bottom.x, p3_bottom.y);
        fieldGraphics.lineTo(p2_bottom.x, p2_bottom.y);
        fieldGraphics.closePath();
        fieldGraphics.fillPath();

        // --------------------------------------------------------
        // 2. キャラクターと影の作成
        // --------------------------------------------------------
        
        // 影（黒い半透明の楕円）
        this.shadowSprite = this.add.ellipse(0, 0, 40, 20, 0x000000, 0.4);
        
        // プレイヤー（丸い黄色の円）
        this.playerSprite = this.add.circle(0, 0, 20, 0xFFD700);
        this.playerSprite.setStrokeStyle(2, 0x000000); // 黒枠

        // --------------------------------------------------------
        // 3. コントローラー（UI）の作成
        // --------------------------------------------------------
        
        const joyStartX = 120;
        const joyStartY = 480;

        // 仮想ジョイスティック
        this.stickBase = this.add.circle(joyStartX, joyStartY, 60, 0x000000, 0.2).setDepth(10000).setScrollFactor(0);
        this.stickKnob = this.add.circle(joyStartX, joyStartY, 30, 0xffffff, 0.6).setDepth(10001).setScrollFactor(0);
        this.joystickPointer = null;

        // ジャンプボタン（右下）
        const jumpBtn = this.add.circle(680, 480, 50, 0xff0000, 0.7).setDepth(10000).setScrollFactor(0).setInteractive();
        
        // テキストラベル
        this.add.text(680, 480, 'JUMP', { fontSize: '18px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(10002);

        // ジャンプボタンのイベント
        jumpBtn.on('pointerdown', () => {
            jumpBtn.setFillStyle(0xcc0000, 0.9);
            this.jump();
        });
        jumpBtn.on('pointerup', () => jumpBtn.setFillStyle(0xff0000, 0.7));
        jumpBtn.on('pointerout', () => jumpBtn.setFillStyle(0xff0000, 0.7));

        // ジョイスティックのイベント
        this.input.on('pointerdown', (pointer) => {
            if (pointer.x < this.scale.width / 2) {
                this.joystickPointer = pointer;
                this.stickBase.setPosition(pointer.x, pointer.y);
                this.stickKnob.setPosition(pointer.x, pointer.y);
            }
        });

        this.input.on('pointermove', (pointer) => {
            if (pointer === this.joystickPointer) {
                let dx = pointer.x - this.stickBase.x;
                let dy = pointer.y - this.stickBase.y;
                let dist = Math.sqrt(dx * dx + dy * dy);
                let maxDist = 60;
                
                if (dist > maxDist) {
                    dx = (dx / dist) * maxDist;
                    dy = (dy / dist) * maxDist;
                }
                
                this.stickKnob.setPosition(this.stickBase.x + dx, this.stickBase.y + dy);
                
                this.player.inputX = dx / maxDist;
                this.player.inputZ = dy / maxDist; 
            }
        });

        this.input.on('pointerup', (pointer) => {
            if (pointer === this.joystickPointer) {
                this.joystickPointer = null;
                this.stickBase.setPosition(joyStartX, joyStartY);
                this.stickKnob.setPosition(joyStartX, joyStartY);
                this.player.inputX = 0;
                this.player.inputZ = 0;
            }
        });

        // キーボード入力設定
        this.cursors = this.input.keyboard.createCursorKeys();
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }

    update() {
        let p = this.player;
        let c = this.cursors;
        let phys = this.PHYSICS;

        // --------------------------------------------------------
        // 1. 入力の取得と移動の計算
        // --------------------------------------------------------
        let moveX = p.inputX;
        let moveZ = p.inputZ;

        if (c.left.isDown) moveX = -1;
        if (c.right.isDown) moveX = 1;
        if (c.up.isDown) moveZ = -1;
        if (c.down.isDown) moveZ = 1;

        let length = Math.sqrt(moveX * moveX + moveZ * moveZ);
        if (length > 1) {
            moveX /= length;
            moveZ /= length;
        }

        if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
            this.jump();
        }

        // --------------------------------------------------------
        // 2. 物理演算と座標更新
        // --------------------------------------------------------
        if (!p.isFalling) {
            p.x += moveX * phys.speed;
            p.z += moveZ * phys.speed;
        }

        p.h += p.vh;
        p.vh -= phys.gravity;

        if (!p.isFalling && p.h <= 0) {
            p.h = 0;
            p.vh = 0;
        }

        // --------------------------------------------------------
        // 3. フィールド外（落下）の判定
        // --------------------------------------------------------
        const s = phys.fieldSize;
        
        if (!p.isFalling) {
            // 地上にいて、フィールドの外に出た瞬間
            if (p.x < -s || p.x > s || p.z < -s || p.z > s) {
                p.isFalling = true;
                // 落下開始した瞬間の位置を「影がその場に残る位置」として固定保存する
                p.fallStartX = Phaser.Math.Clamp(p.x, -s, s);
                p.fallStartZ = Phaser.Math.Clamp(p.z, -s, s);
            }
        }

        // 一定以上落下したらスタート地点へリセット
        if (p.h < -600) {
            this.resetPlayer();
        }

        // --------------------------------------------------------
        // 4. 描画位置の更新（疑似3D変換）
        // --------------------------------------------------------
        
        // 【影の計算】
        // 落下中は「落下し始めた瞬間の端の位置(fallStartX/Z)」に影を固定する。地上では通常の現在地。
        let shadowX = p.isFalling ? p.fallStartX : p.x;
        let shadowZ = (p.isFalling ? p.fallStartZ : p.z) + phys.shadowOffset;
        
        let shadowScreen = this.worldToScreen(shadowX, shadowZ, 0);
        
        this.shadowSprite.setPosition(shadowScreen.x, shadowScreen.y);
        // 影のdepthを十分に小さくし、キャラクターよりも確実に奥（背後）に描画されるようにする
        this.shadowSprite.setDepth(shadowZ - 999);

        // 影のサイズ調整（ジャンプ中や落下中のスケール維持）
        if (p.h > 0) {
            let scale = Math.max(0.3, 1 - (p.h / 150));
            this.shadowSprite.setScale(scale);
        } else {
            this.shadowSprite.setScale(1);
        }

        // 【キャラクターの計算】
        let playerScreen = this.worldToScreen(p.x, p.z, p.h);
        
        this.playerSprite.setPosition(playerScreen.x, playerScreen.y);
        // キャラクターのdepthは現在のZ座標にする（影の深度を小さくしたため、これで確実に手前に描画されます）
        this.playerSprite.setDepth(p.z);
    }

    jump() {
        if (!this.player.isFalling && this.player.h === 0) {
            this.player.vh = this.PHYSICS.jumpVelocity;
        }
    }

    worldToScreen(x, z, h) {
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;
        
        return {
            x: centerX + x,
            y: centerY + (z * 0.5) - h 
        };
    }

    resetPlayer() {
        this.player.x = 0;
        this.player.z = 0;
        this.player.h = 200;
        this.player.vh = 0;
        this.player.isFalling = false;
    }
}

// Phaserゲームの設定
const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.FIT,
        parent: 'phaser-example',
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 800,
        height: 600
    },
    backgroundColor: '#87CEEB',
    scene: MainScene,
    input: {
        activePointers: 3
    }
};

const game = new Phaser.Game(config);
