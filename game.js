// ==========================================
// パーティーゲーム - 疑似3Dアクションベース
// ==========================================

const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.FIT,
        parent: 'phaser-example',
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 800,
        height: 600
    },
    backgroundColor: '#87CEEB', // 空の色
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    input: {
        activePointers: 3 // マルチタッチ対応（ジョイスティックとジャンプの同時押し用）
    }
};

const game = new Phaser.Game(config);

// プレイヤーの状態を管理するオブジェクト
let player = {
    x: 0,
    z: 0,
    h: 0,
    vx: 0,
    vz: 0,
    vh: 0,
    isFalling: false,
    inputX: 0,
    inputZ: 0
};

// 物理・操作の調整用パラメータ
const PHYSICS = {
    speed: 4,           // 移動速度
    gravity: 0.6,       // 重力
    jumpVelocity: 12,   // ジャンプの初速
    fieldSize: 200,     // フィールドのサイズ（中心からの半径）
    shadowOffset: 15    // 影をどれくらい手前に表示するか
};

// スプライトなどの参照用
let playerSprite;
let shadowSprite;
let cursors;
let spaceKey;

// ジョイスティック用UI
const joyStartX = 120;
const joyStartY = 480;
let stickBase;
let stickKnob;
let joystickPointer = null;

function preload() {
    // 外部画像は使わず、今回はGraphicsで円を描画してテクスチャとして使用します
}

function create() {
    // --------------------------------------------------------
    // 1. 疑似3Dフィールドの描画（厚みのある土台）
    // --------------------------------------------------------
    const fieldGraphics = this.add.graphics();
    fieldGraphics.setDepth(-9999); // 常に一番奥（下）に描画

    const s = PHYSICS.fieldSize;
    const thickness = 50; // 土台の厚み

    // 上面の描画（明るい緑）
    fieldGraphics.fillStyle(0x7CFC00, 1);
    let p1 = worldToScreen(-s, -s, 0); // 左奥
    let p2 = worldToScreen(s, -s, 0);  // 右奥
    let p3 = worldToScreen(s, s, 0);   // 右手前
    let p4 = worldToScreen(-s, s, 0);  // 左手前

    fieldGraphics.beginPath();
    fieldGraphics.moveTo(p1.x, p1.y);
    fieldGraphics.lineTo(p2.x, p2.y);
    fieldGraphics.lineTo(p3.x, p3.y);
    fieldGraphics.lineTo(p4.x, p4.y);
    fieldGraphics.closePath();
    fieldGraphics.fillPath();

    // 側面の描画：前面（暗めの緑）
    fieldGraphics.fillStyle(0x556B2F, 1);
    let p3_bottom = worldToScreen(s, s, -thickness);
    let p4_bottom = worldToScreen(-s, s, -thickness);

    fieldGraphics.beginPath();
    fieldGraphics.moveTo(p3.x, p3.y);
    fieldGraphics.lineTo(p4.x, p4.y);
    fieldGraphics.lineTo(p4_bottom.x, p4_bottom.y);
    fieldGraphics.lineTo(p3_bottom.x, p3_bottom.y);
    fieldGraphics.closePath();
    fieldGraphics.fillPath();

    // 側面の描画：右側面（少し暗い緑）
    fieldGraphics.fillStyle(0x6B8E23, 1);
    let p2_bottom = worldToScreen(s, -s, -thickness);
    
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
    shadowSprite = this.add.ellipse(0, 0, 40, 20, 0x000000, 0.4);
    
    // プレイヤー（丸い黄色の円）
    playerSprite = this.add.circle(0, 0, 20, 0xFFD700);
    playerSprite.setStrokeStyle(2, 0x000000); // 黒枠

    // --------------------------------------------------------
    // 3. コントローラー（UI）の作成
    // --------------------------------------------------------
    
    // 仮想ジョイスティック
    stickBase = this.add.circle(joyStartX, joyStartY, 60, 0x000000, 0.2).setDepth(10000).setScrollFactor(0);
    stickKnob = this.add.circle(joyStartX, joyStartY, 30, 0xffffff, 0.6).setDepth(10001).setScrollFactor(0);

    // ジャンプボタン（右下）
    const jumpBtn = this.add.circle(680, 480, 50, 0xff0000, 0.7).setDepth(10000).setScrollFactor(0).setInteractive();
    
    // テキストラベル
    this.add.text(680, 480, 'JUMP', { fontSize: '18px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(10002);

    // ジャンプボタンのイベント
    jumpBtn.on('pointerdown', () => {
        jumpBtn.setFillStyle(0xcc0000, 0.9);
        jump();
    });
    jumpBtn.on('pointerup', () => jumpBtn.setFillStyle(0xff0000, 0.7));
    jumpBtn.on('pointerout', () => jumpBtn.setFillStyle(0xff0000, 0.7));

    // ジョイスティックのイベント
    this.input.on('pointerdown', (pointer) => {
        // 画面の左半分をタッチしたらジョイスティック起動（フローティング仕様）
        if (pointer.x < config.width / 2) {
            joystickPointer = pointer;
            stickBase.setPosition(pointer.x, pointer.y);
            stickKnob.setPosition(pointer.x, pointer.y);
        }
    });

    this.input.on('pointermove', (pointer) => {
        if (pointer === joystickPointer) {
            let dx = pointer.x - stickBase.x;
            let dy = pointer.y - stickBase.y;
            let dist = Math.sqrt(dx * dx + dy * dy);
            let maxDist = 60;
            
            if (dist > maxDist) {
                dx = (dx / dist) * maxDist;
                dy = (dy / dist) * maxDist;
            }
            
            stickKnob.setPosition(stickBase.x + dx, stickBase.y + dy);
            
            // 入力を正規化 (-1.0 ~ 1.0)
            player.inputX = dx / maxDist;
            player.inputZ = dy / maxDist; 
        }
    });

    this.input.on('pointerup', (pointer) => {
        if (pointer === joystickPointer) {
            joystickPointer = null;
            // 指を離したら元の位置へ戻す
            stickBase.setPosition(joyStartX, joyStartY);
            stickKnob.setPosition(joyStartX, joyStartY);
            player.inputX = 0;
            player.inputZ = 0;
        }
    });

    // キーボード入力設定
    cursors = this.input.keyboard.createCursorKeys();
    spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
}

function update() {
    // --------------------------------------------------------
    // 1. 入力の取得と移動の計算
    // --------------------------------------------------------
    let moveX = player.inputX;
    let moveZ = player.inputZ;

    // キーボード入力で上書き（キーボードが優先）
    if (cursors.left.isDown) moveX = -1;
    if (cursors.right.isDown) moveX = 1;
    if (cursors.up.isDown) moveZ = -1;
    if (cursors.down.isDown) moveZ = 1;

    // 斜め移動が速くなりすぎないように正規化
    let length = Math.sqrt(moveX * moveX + moveZ * moveZ);
    if (length > 1) {
        moveX /= length;
        moveZ /= length;
    }

    // スペースキーでジャンプ
    if (Phaser.Input.Keyboard.JustDown(spaceKey)) {
        jump();
    }

    // --------------------------------------------------------
    // 2. 物理演算と座標更新
    // --------------------------------------------------------
    
    // 落下中でなければ移動を反映
    if (!player.isFalling) {
        player.x += moveX * PHYSICS.speed;
        player.z += moveZ * PHYSICS.speed;
    }

    // 高さ（H）の更新（ジャンプと重力）
    player.h += player.vh;
    player.vh -= PHYSICS.gravity;

    // 地面への着地判定（落下状態でない場合のみ）
    if (!player.isFalling && player.h <= 0) {
        player.h = 0;
        player.vh = 0;
    }

    // --------------------------------------------------------
    // 3. フィールド外（落下）の判定
    // --------------------------------------------------------
    if (!player.isFalling) {
        const s = PHYSICS.fieldSize;
        // フィールドの外に出た瞬間
        if (player.x < -s || player.x > s || player.z < -s || player.z > s) {
            player.isFalling = true;
            
            // XとZの座標をフィールドの端に固定する（貫通・滑り防止）
            player.x = Phaser.Math.Clamp(player.x, -s, s);
            player.z = Phaser.Math.Clamp(player.z, -s, s);
        }
    }

    // 十分に落下したら初期位置にリセット
    if (player.h < -800) {
        resetPlayer();
    }

    // --------------------------------------------------------
    // 4. 描画位置の更新（疑似3D変換）
    // --------------------------------------------------------
    
    // 【影の計算】
    // 影はキャラクターより手前（Z方向）にずらす
    let shadowZ = player.z + PHYSICS.shadowOffset;
    // 影のHは常に0（地面）としてスクリーン座標を計算
    let shadowScreen = worldToScreen(player.x, shadowZ, 0);
    
    shadowSprite.setPosition(shadowScreen.x, shadowScreen.y);
    shadowSprite.setDepth(shadowZ - 1); // キャラクターより少し下

    // 影のサイズ調整（巨大化バグ防止）
    if (player.h > 0) {
        // ジャンプ中は高く飛ぶほど影を小さくする
        let scale = Math.max(0.3, 1 - (player.h / 150));
        shadowSprite.setScale(scale);
    } else {
        // 地面にいる時、または落下中(h < 0)は影のサイズを維持
        shadowSprite.setScale(1);
    }

    // 【キャラクターの計算】
    let playerScreen = worldToScreen(player.x, player.z, player.h);
    
    playerSprite.setPosition(playerScreen.x, playerScreen.y);
    playerSprite.setDepth(player.z); // Z座標による描画順
}

// ==========================================
// 補助関数群
// ==========================================

// ジャンプ関数
function jump() {
    // 地面に立っている（落下中ではなく、Hが0）時のみジャンプ可能
    if (!player.isFalling && player.h === 0) {
        player.vh = PHYSICS.jumpVelocity;
    }
}

// 疑似3D座標(X, Z, H)を画面座標(screenX, screenY)に変換する関数
function worldToScreen(x, z, h) {
    const centerX = config.width / 2;
    const centerY = config.height / 2;
    
    return {
        x: centerX + x,
        // 奥(Zがマイナス)ほど画面上で上になり、手前ほど下になる。Hが高いほど上になる。
        y: centerY + (z * 0.5) - h 
    };
}

// プレイヤーを初期位置に戻す関数
function resetPlayer() {
    player.x = 0;
    player.z = 0;
    player.h = 200; // 上から降ってくる演出
    player.vh = 0;
    player.isFalling = false;
}
