const config = {
  type: Phaser.AUTO,

  width: 800,
  height: 600,

  backgroundColor: '#87CEEB',

  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },

  parent: 'game-container',

  scene: {
    create,
    update
  }
};

const game = new Phaser.Game(config);


// ==========================================
// フィールド設定
// ==========================================

const FIELD_WIDTH = 650;
const FIELD_DEPTH = 360;


// ==========================================
// プレイヤー
// ==========================================

let player;
let playerShadow;

let playerX = 0;
let playerZ = 0;
let playerH = 0;

let playerVX = 0;
let playerVZ = 0;
let playerVH = 0;

let isFalling = false;
let fallVelocity = 0;


// ==========================================
// 物理設定
// ==========================================

const MOVE_SPEED = 3.5;
const GRAVITY = 0.55;
const JUMP_POWER = 11;


// ==========================================
// スタート地点
// ==========================================

const START_X = 0;
const START_Z = 0;


// ==========================================
// ジョイスティック
// ==========================================

let joystickBase;
let joystickKnob;

let joystickX = 0;
let joystickY = 0;

let movePointerId = null;


// ==========================================
// ジャンプボタン
// ==========================================

let jumpButton;
let jumpText;


// ==========================================
// 世界座標 → 画面座標
// ==========================================

function worldToScreen(x, z, h) {

  return {
    x: 400 + x,
    y: 360 + z * 0.65 - h
  };

}


// ==========================================
// フィールド描画
// ==========================================

function drawField(scene) {

  const graphics = scene.add.graphics();

  const x1 = -FIELD_WIDTH / 2;
  const x2 = FIELD_WIDTH / 2;

  const z1 = -FIELD_DEPTH / 2;
  const z2 = FIELD_DEPTH / 2;

  const p1 = worldToScreen(x1, z1, 0);
  const p2 = worldToScreen(x2, z1, 0);
  const p3 = worldToScreen(x2, z2, 0);
  const p4 = worldToScreen(x1, z2, 0);


  // ------------------------------------------
  // 土台の側面
  // ------------------------------------------

  graphics.fillStyle(0x4f713b, 1);

  graphics.beginPath();

  graphics.moveTo(p1.x, p1.y);
  graphics.lineTo(p2.x, p2.y);

  graphics.lineTo(p2.x, p2.y + 80);
  graphics.lineTo(p3.x, p3.y + 80);
  graphics.lineTo(p4.x, p4.y + 80);

  graphics.lineTo(p4.x, p4.y);

  graphics.closePath();

  graphics.fillPath();


  // ------------------------------------------
  // 地面
  // ------------------------------------------

  graphics.fillStyle(0x79a85b, 1);

  graphics.beginPath();

  graphics.moveTo(p1.x, p1.y);
  graphics.lineTo(p2.x, p2.y);
  graphics.lineTo(p3.x, p3.y);
  graphics.lineTo(p4.x, p4.y);

  graphics.closePath();

  graphics.fillPath();


  // ------------------------------------------
  // フィールドの縁
  // ------------------------------------------

  graphics.lineStyle(
    4,
    0x5f8b45,
    1
  );

  graphics.beginPath();

  graphics.moveTo(p1.x, p1.y);
  graphics.lineTo(p2.x, p2.y);
  graphics.lineTo(p3.x, p3.y);
  graphics.lineTo(p4.x, p4.y);

  graphics.closePath();

  graphics.strokePath();


  // ------------------------------------------
  // 地面の模様
  // ------------------------------------------

  graphics.lineStyle(
    2,
    0x6d984f,
    0.35
  );

  for (
    let x = x1 + 40;
    x < x2;
    x += 80
  ) {

    for (
      let z = z1 + 40;
      z < z2;
      z += 70
    ) {

      const a =
        worldToScreen(x, z, 0);

      const b =
        worldToScreen(
          x + 20,
          z + 10,
          0
        );

      graphics.lineBetween(
        a.x,
        a.y,
        b.x,
        b.y
      );

    }

  }

}


// ==========================================
// フィールド内判定
// ==========================================

function isInsideField(x, z) {

  return (
    x >= -FIELD_WIDTH / 2 &&
    x <= FIELD_WIDTH / 2 &&
    z >= -FIELD_DEPTH / 2 &&
    z <= FIELD_DEPTH / 2
  );

}


// ==========================================
// プレイヤー表示更新
// ==========================================

function updatePlayerVisual() {

  const pos =
    worldToScreen(
      playerX,
      playerZ,
      playerH
    );


  // 影は地面に固定

  const shadowPos =
    worldToScreen(
      playerX,
      playerZ,
      0
    );

  playerShadow.x =
    shadowPos.x;

  playerShadow.y =
    shadowPos.y;


  // ジャンプすると影を小さくする

  const shadowScale =
    Math.max(
      0.45,
      1 - playerH / 120
    );

  playerShadow.scaleX =
    shadowScale;

  playerShadow.scaleY =
    shadowScale;


  // プレイヤー

  player.x =
    pos.x;

  player.y =
    pos.y;


  // ジャンプ中の立体感

  const scale =
    1 +
    Math.min(
      playerH / 500,
      0.12
    );

  player.setScale(scale);

}


// ==========================================
// ジャンプ
// ==========================================

function jump() {

  if (isFalling) {
    return;
  }

  if (
    playerH <= 0.1 &&
    playerVH <= 0
  ) {

    playerVH =
      JUMP_POWER;

  }

}


// ==========================================
// プレイヤーをリセット
// ==========================================

function resetPlayer() {

  playerX = START_X;
  playerZ = START_Z;
  playerH = 0;

  playerVX = 0;
  playerVZ = 0;
  playerVH = 0;

  isFalling = false;
  fallVelocity = 0;

  updatePlayerVisual();

}


// ==========================================
// ジョイスティック
// ==========================================

function updateJoystick(pointer) {

  const dx =
    pointer.x -
    joystickBase.x;

  const dy =
    pointer.y -
    joystickBase.y;

  const distance =
    Math.sqrt(
      dx * dx +
      dy * dy
    );

  const maxDistance = 40;


  if (distance > maxDistance) {

    joystickX =
      dx / distance;

    joystickY =
      dy / distance;


    joystickKnob.x =
      joystickBase.x +
      joystickX * maxDistance;

    joystickKnob.y =
      joystickBase.y +
      joystickY * maxDistance;

  } else {

    joystickX =
      dx / maxDistance;

    joystickY =
      dy / maxDistance;


    joystickKnob.x =
      pointer.x;

    joystickKnob.y =
      pointer.y;

  }

}


// ==========================================
// CREATE
// ==========================================

function create() {

  // フィールド

  drawField(this);


  // プレイヤーの影

  playerShadow =
    this.add.ellipse(
      0,
      0,
      48,
      22,
      0x000000,
      0.25
    );


  // 仮プレイヤー
  // 後で動物キャラクターに変更する

  player =
    this.add.circle(
      0,
      0,
      25,
      0xffcc66
    );


  // キーボード

  cursors =
    this.input.keyboard
      .createCursorKeys();


  // ------------------------------------------
  // ジョイスティック
  // ------------------------------------------

  joystickBase =
    this.add.circle(
      100,
      510,
      55,
      0x333333,
      0.45
    );


  joystickKnob =
    this.add.circle(
      100,
      510,
      25,
      0xffffff,
      0.85
    );


  // ------------------------------------------
  // ジャンプボタン
  // ------------------------------------------

  jumpButton =
    this.add.circle(
      700,
      510,
      45,
      0x333333,
      0.55
    );


  jumpText =
    this.add.text(
      700,
      510,
      'JUMP',
      {
        fontSize: '16px',
        color: '#ffffff',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5);


  // ------------------------------------------
  // マルチタッチ
  // ------------------------------------------

  this.input.addPointer(3);


  // ------------------------------------------
  // 指を押した
  // ------------------------------------------

  this.input.on(
    'pointerdown',
    function(pointer) {

      // ジョイスティック

      if (
        pointer.x < 250 &&
        pointer.y > 400 &&
        movePointerId === null
      ) {

        movePointerId =
          pointer.id;

        updateJoystick(pointer);

        return;

      }


      // ジャンプ

      if (
        pointer.x > 600 &&
        pointer.y > 430
      ) {

        jump();

      }

    }
  );


  // ------------------------------------------
  // 指を動かした
  // ------------------------------------------

  this.input.on(
    'pointermove',
    function(pointer) {

      if (
        pointer.id === movePointerId &&
        pointer.isDown
      ) {

        updateJoystick(pointer);

      }

    }
  );


  // ------------------------------------------
  // 指を離した
  // ------------------------------------------

  this.input.on(
    'pointerup',
    function(pointer) {

      if (
        pointer.id === movePointerId
      ) {

        movePointerId =
          null;

        joystickX = 0;
        joystickY = 0;

        joystickKnob.x =
          joystickBase.x;

        joystickKnob.y =
          joystickBase.y;

      }

    }
  );


  // ------------------------------------------
  // タッチキャンセル
  // ------------------------------------------

  this.input.on(
    'pointercancel',
    function(pointer) {

      if (
        pointer.id === movePointerId
      ) {

        movePointerId =
          null;

        joystickX = 0;
        joystickY = 0;

        joystickKnob.x =
          joystickBase.x;

        joystickKnob.y =
          joystickBase.y;

      }

    }
  );


  // 初期位置

  resetPlayer();

}


// ==========================================
// UPDATE
// ==========================================

function update() {

  // ========================================
  // 落下中
  // ========================================

  if (isFalling) {

    fallVelocity += 0.7;

    playerH -= fallVelocity;

    updatePlayerVisual();


    // 十分落下したらリセット

    if (playerH < -250) {

      resetPlayer();

    }

    return;

  }


  // ========================================
  // 入力
  // ========================================

  let moveX =
    joystickX;

  let moveZ =
    joystickY;


  // キーボード

  if (cursors.left.isDown) {
    moveX = -1;
  }

  if (cursors.right.isDown) {
    moveX = 1;
  }

  if (cursors.up.isDown) {
    moveZ = -1;
  }

  if (cursors.down.isDown) {
    moveZ = 1;
  }


  // ========================================
  // 移動
  // ========================================

  playerVX =
    moveX * MOVE_SPEED;

  playerVZ =
    moveZ * MOVE_SPEED;


  playerX +=
    playerVX;

  playerZ +=
    playerVZ;


  // ========================================
  // フィールドの端
  // ========================================

  if (
    !isInsideField(
      playerX,
      playerZ
    )
  ) {

    isFalling = true;

    fallVelocity = 1;

  }


  // ========================================
  // ジャンプ
  // ========================================

  playerVH -=
    GRAVITY;

  playerH +=
    playerVH;


  // 着地

  if (playerH < 0) {

    playerH = 0;

    playerVH = 0;

  }


  // ========================================
  // キーボードのジャンプ
  // ========================================

  if (
    Phaser.Input.Keyboard.JustDown(
      cursors.space
    )
  ) {

    jump();

  }


  // ========================================
  // 表示更新
  // ========================================

  updatePlayerVisual();

}
