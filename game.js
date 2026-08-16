// ======================================================
// PARTY GAME
// 基本フィールド Ver.2
// ======================================================


// ======================================================
// GAME CONFIG
// ======================================================

const config = {
  type: Phaser.AUTO,

  width: 800,
  height: 600,

  backgroundColor: '#87CEEB',

  parent: 'game-container',

  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },

  scene: {
    create: create,
    update: update
  }
};


const game = new Phaser.Game(config);


// ======================================================
// FIELD
// ======================================================

const FIELD_WIDTH = 650;
const FIELD_DEPTH = 360;


// ======================================================
// PLAYER
// ======================================================

let player;
let playerShadow;

let playerX = 0;
let playerZ = 0;
let playerH = 0;

let playerVX = 0;
let playerVZ = 0;
let playerVH = 0;


// ======================================================
// MOVEMENT
// ======================================================

const MOVE_SPEED = 3.5;

const GRAVITY = 0.55;

const JUMP_POWER = 11;


// ======================================================
// FALL
// ======================================================

let isFalling = false;

let fallVelocity = 0;

let fallDirection = '';


// ======================================================
// START POSITION
// ======================================================

const START_X = 0;
const START_Z = 0;


// ======================================================
// JOYSTICK
// ======================================================

let joystickBase;
let joystickKnob;

let joystickX = 0;
let joystickY = 0;

let movePointerId = null;


// ======================================================
// JUMP BUTTON
// ======================================================

let jumpButton;
let jumpText;


// ======================================================
// KEYBOARD
// ======================================================

let cursors;


// ======================================================
// WORLD → SCREEN
// ======================================================
//
// X = 左右
//
// Z = 奥行き
//
// H = 高さ
//
// 奥に行くほど画面上へ。
// 高くジャンプするほど画面上へ。
// ======================================================

function worldToScreen(x, z, h) {

  return {

    x: 400 + x,

    y:
      360 +
      z * 0.65 -
      h

  };

}


// ======================================================
// FIELD DRAW
// ======================================================

function drawField(scene) {

  const graphics =
    scene.add.graphics();


  const x1 =
    -FIELD_WIDTH / 2;

  const x2 =
    FIELD_WIDTH / 2;

  const z1 =
    -FIELD_DEPTH / 2;

  const z2 =
    FIELD_DEPTH / 2;


  const p1 =
    worldToScreen(
      x1,
      z1,
      0
    );

  const p2 =
    worldToScreen(
      x2,
      z1,
      0
    );

  const p3 =
    worldToScreen(
      x2,
      z2,
      0
    );

  const p4 =
    worldToScreen(
      x1,
      z2,
      0
    );


  // ==================================================
  // FIELD SIDE
  // ==================================================

  graphics.fillStyle(
    0x4f713b,
    1
  );


  graphics.beginPath();

  graphics.moveTo(
    p1.x,
    p1.y
  );

  graphics.lineTo(
    p2.x,
    p2.y
  );

  graphics.lineTo(
    p2.x,
    p2.y + 80
  );

  graphics.lineTo(
    p3.x,
    p3.y + 80
  );

  graphics.lineTo(
    p4.x,
    p4.y + 80
  );

  graphics.lineTo(
    p4.x,
    p4.y
  );

  graphics.closePath();

  graphics.fillPath();


  // ==================================================
  // FIELD TOP
  // ==================================================

  graphics.fillStyle(
    0x79a85b,
    1
  );


  graphics.beginPath();

  graphics.moveTo(
    p1.x,
    p1.y
  );

  graphics.lineTo(
    p2.x,
    p2.y
  );

  graphics.lineTo(
    p3.x,
    p3.y
  );

  graphics.lineTo(
    p4.x,
    p4.y
  );

  graphics.closePath();

  graphics.fillPath();


  // ==================================================
  // FIELD EDGE
  // ==================================================

  graphics.lineStyle(
    4,
    0x5f8b45,
    1
  );


  graphics.beginPath();

  graphics.moveTo(
    p1.x,
    p1.y
  );

  graphics.lineTo(
    p2.x,
    p2.y
  );

  graphics.lineTo(
    p3.x,
    p3.y
  );

  graphics.lineTo(
    p4.x,
    p4.y
  );

  graphics.closePath();

  graphics.strokePath();


  // ==================================================
  // GROUND PATTERN
  // ==================================================

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
        worldToScreen(
          x,
          z,
          0
        );

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


  // ==================================================
  // FIELD DEPTH
  // ==================================================
  //
  // 地面はプレイヤーより先に描画。
  // プレイヤーは地面の上に存在する。
  // ==================================================

  graphics.setDepth(0);

}


// ======================================================
// FIELD CHECK
// ======================================================

function isInsideField(x, z) {

  return (

    x >= -FIELD_WIDTH / 2 &&

    x <= FIELD_WIDTH / 2 &&

    z >= -FIELD_DEPTH / 2 &&

    z <= FIELD_DEPTH / 2

  );

}


// ======================================================
// FIND FALL DIRECTION
// ======================================================
//
// どの方向からフィールド外へ出たか調べる。
// ======================================================

function getFallDirection(x, z) {

  const halfWidth =
    FIELD_WIDTH / 2;

  const halfDepth =
    FIELD_DEPTH / 2;


  // 奥

  if (
    z < -halfDepth
  ) {

    return 'back';

  }


  // 手前

  if (
    z > halfDepth
  ) {

    return 'front';

  }


  // 左

  if (
    x < -halfWidth
  ) {

    return 'left';

  }


  // 右

  if (
    x > halfWidth
  ) {

    return 'right';

  }


  return '';

}


// ======================================================
// PLAYER VISUAL
// ======================================================

function updatePlayerVisual() {

  if (!player) {
    return;
  }


  // ====================================================
  // FALLING
  // ====================================================

  if (isFalling) {

    // ----------------------------------------------
    // 奥側へ落ちた場合
    // ----------------------------------------------
    //
    // 地面の向こう側へ落ちたので、
    // キャラクターを地面の後ろに隠す。
    //

    if (
      fallDirection === 'back'
    ) {

      player.setVisible(false);

      playerShadow.setVisible(false);

      return;

    }


    // ----------------------------------------------
    // 手前・左右から落下
    // ----------------------------------------------

    player.setVisible(true);

    playerShadow.setVisible(false);


    const fallingPosition =
      worldToScreen(
        playerX,
        playerZ,
        playerH
      );


    player.x =
      fallingPosition.x;

    player.y =
      fallingPosition.y;


    return;

  }


  // ====================================================
  // NORMAL
  // ====================================================

  player.setVisible(true);

  playerShadow.setVisible(true);


  // ====================================================
  // PLAYER POSITION
  // ====================================================

  const playerPosition =
    worldToScreen(
      playerX,
      playerZ,
      playerH
    );


  player.x =
    playerPosition.x;

  player.y =
    playerPosition.y;


  // ====================================================
  // SHADOW POSITION
  // ====================================================
  //
  // 影は「キャラクターの現在位置」ではなく
  // 「キャラクターの足元」に置く。
  //
  // つまり H を 0 にする。
  // ====================================================

  const shadowPosition =
    worldToScreen(
      playerX,
      playerZ,
      0
    );


  playerShadow.x =
    shadowPosition.x;

  playerShadow.y =
    shadowPosition.y;


  // ====================================================
  // SHADOW SCALE
  // ====================================================
  //
  // 地面にいるとき → 100%
  //
  // 高くジャンプ → 少し小さく
  //
  // 落下中 → ここには来ない
  // ====================================================

  const shadowScale =
    Math.max(
      0.45,
      1 -
      playerH / 120
    );


  playerShadow.setScale(
    shadowScale
  );


  // ====================================================
  // PLAYER SCALE
  // ====================================================

  const playerScale =
    1 +
    Math.min(
      playerH / 500,
      0.12
    );


  player.setScale(
    playerScale
  );


  // ====================================================
  // DEPTH
  // ====================================================
  //
  // 手前にいるキャラクターほど
  // 前に描画される。
  //
  // 今後、アイテムや他プレイヤーを追加するときに
  // 非常に重要になる。
  // ====================================================

  player.setDepth(
    1000 + playerZ
  );


  playerShadow.setDepth(
    900 + playerZ
  );

}


// ======================================================
// JUMP
// ======================================================

function jump() {

  // 落下中はジャンプ不可

  if (
    isFalling
  ) {

    return;

  }


  // 地面に立っているとき

  if (

    playerH <= 0.1 &&

    playerVH <= 0

  ) {

    playerVH =
      JUMP_POWER;

  }

}


// ======================================================
// START FALL
// ======================================================

function startFall() {

  if (
    isFalling
  ) {

    return;

  }


  isFalling =
    true;


  fallVelocity =
    1;


  fallDirection =
    getFallDirection(
      playerX,
      playerZ
    );


  // 落下開始時点で影を消す

  playerShadow.setVisible(
    false
  );


  // 奥側なら即座に地面の後ろへ

  if (
    fallDirection === 'back'
  ) {

    player.setVisible(
      false
    );

  }


}


// ======================================================
// RESET PLAYER
// ======================================================

function resetPlayer() {

  playerX =
    START_X;

  playerZ =
    START_Z;

  playerH =
    0;


  playerVX =
    0;

  playerVZ =
    0;

  playerVH =
    0;


  isFalling =
    false;


  fallVelocity =
    0;


  fallDirection =
    '';


  player.setVisible(
    true
  );


  playerShadow.setVisible(
    true
  );


  updatePlayerVisual();

}


// ======================================================
// JOYSTICK
// ======================================================

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


  const maxDistance =
    40;


  if (
    distance > maxDistance
  ) {

    joystickX =
      dx / distance;

    joystickY =
      dy / distance;


    joystickKnob.x =
      joystickBase.x +
      joystickX *
      maxDistance;

    joystickKnob.y =
      joystickBase.y +
      joystickY *
      maxDistance;

  }

  else {

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


// ======================================================
// CREATE
// ======================================================

function create() {


  // ====================================================
  // FIELD
  // ====================================================

  drawField(this);


  // ====================================================
  // SHADOW
  // ====================================================

  playerShadow =
    this.add.ellipse(

      0,
      0,

      48,
      22,

      0x000000,
      0.25

    );


  playerShadow.setDepth(
    900
  );


  // ====================================================
  // PLAYER
  // ====================================================

  player =
    this.add.circle(

      0,
      0,

      25,

      0xffcc66

    );


  player.setDepth(
    1000
  );


  // ====================================================
  // KEYBOARD
  // ====================================================

  cursors =
    this.input.keyboard
      .createCursorKeys();


  // ====================================================
  // JOYSTICK BASE
  // ====================================================

  joystickBase =
    this.add.circle(

      100,
      510,

      55,

      0x333333,
      0.45

    );


  joystickBase.setScrollFactor(
    0
  );


  joystickBase.setDepth(
    5000
  );


  // ====================================================
  // JOYSTICK KNOB
  // ====================================================

  joystickKnob =
    this.add.circle(

      100,
      510,

      25,

      0xffffff,
      0.85

    );


  joystickKnob.setScrollFactor(
    0
  );


  joystickKnob.setDepth(
    5001
  );


  // ====================================================
  // JUMP BUTTON
  // ====================================================

  jumpButton =
    this.add.circle(

      700,
      510,

      45,

      0x333333,
      0.55

    );


  jumpButton.setScrollFactor(
    0
  );


  jumpButton.setDepth(
    5000
  );


  // ====================================================
  // JUMP TEXT
  // ====================================================

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


  jumpText.setScrollFactor(
    0
  );


  jumpText.setDepth(
    5001
  );


  // ====================================================
  // MULTI TOUCH
  // ====================================================

  this.input.addPointer(
    3
  );


  // ====================================================
  // POINTER DOWN
  // ====================================================

  this.input.on(
    'pointerdown',
    function(pointer) {


      // ----------------------------------------------
      // MOVE
      // ----------------------------------------------

      if (

        pointer.x < 250 &&

        pointer.y > 400 &&

        movePointerId === null

      ) {

        movePointerId =
          pointer.id;


        updateJoystick(
          pointer
        );


        return;

      }


      // ----------------------------------------------
      // JUMP
      // ----------------------------------------------

      if (

        pointer.x > 600 &&

        pointer.y > 430

      ) {

        jump();

      }

    }
  );


  // ====================================================
  // POINTER MOVE
  // ====================================================

  this.input.on(
    'pointermove',
    function(pointer) {


      if (

        pointer.id ===
        movePointerId &&

        pointer.isDown

      ) {

        updateJoystick(
          pointer
        );

      }

    }
  );


  // ====================================================
  // POINTER UP
  // ====================================================

  this.input.on(
    'pointerup',
    function(pointer) {


      if (
        pointer.id ===
        movePointerId
      ) {

        movePointerId =
          null;


        joystickX =
          0;

        joystickY =
          0;


        joystickKnob.x =
          joystickBase.x;

        joystickKnob.y =
          joystickBase.y;

      }

    }
  );


  // ====================================================
  // POINTER CANCEL
  // ====================================================

  this.input.on(
    'pointercancel',
    function(pointer) {


      if (
        pointer.id ===
        movePointerId
      ) {

        movePointerId =
          null;


        joystickX =
          0;

        joystickY =
          0;


        joystickKnob.x =
          joystickBase.x;

        joystickKnob.y =
          joystickBase.y;

      }

    }
  );


  // ====================================================
  // RESET
  // ====================================================

  resetPlayer();

}


// ======================================================
// UPDATE
// ======================================================

function update() {


  // ====================================================
  // FALLING
  // ====================================================

  if (
    isFalling
  ) {


    // ----------------------------------------------
    // 落下速度
    // ----------------------------------------------

    fallVelocity +=
      0.7;


    // ----------------------------------------------
    // 高さを下げる
    // ----------------------------------------------

    playerH -=
      fallVelocity;


    // ----------------------------------------------
    // 表示更新
    // ----------------------------------------------

    updatePlayerVisual();


    // ----------------------------------------------
    // 十分落ちたらリセット
    // ----------------------------------------------

    if (
      playerH < -250
    ) {

      resetPlayer();

    }


    return;

  }


  // ====================================================
  // INPUT
  // ====================================================

  let moveX =
    joystickX;

  let moveZ =
    joystickY;


  // ====================================================
  // KEYBOARD
  // ====================================================

  if (
    cursors.left.isDown
  ) {

    moveX =
      -1;

  }


  if (
    cursors.right.isDown
  ) {

    moveX =
      1;

  }


  if (
    cursors.up.isDown
  ) {

    moveZ =
      -1;

  }


  if (
    cursors.down.isDown
  ) {

    moveZ =
      1;

  }


  // ====================================================
  // MOVEMENT
  // ====================================================

  playerVX =
    moveX *
    MOVE_SPEED;


  playerVZ =
    moveZ *
    MOVE_SPEED;


  playerX +=
    playerVX;


  playerZ +=
    playerVZ;


  // ====================================================
  // FIELD EDGE
  // ====================================================

  if (
    !isInsideField(
      playerX,
      playerZ
    )
  ) {

    startFall();

  }


  // ====================================================
  // JUMP PHYSICS
  // ====================================================

  playerVH -=
    GRAVITY;


  playerH +=
    playerVH;


  // ====================================================
  // LANDING
  // ====================================================

  if (
    playerH < 0
  ) {

    playerH =
      0;

    playerVH =
      0;

  }


  // ====================================================
  // KEYBOARD JUMP
  // ====================================================

  if (
    Phaser.Input.Keyboard.JustDown(
      cursors.space
    )
  ) {

    jump();

  }


  // ====================================================
  // VISUAL
  // ====================================================

  updatePlayerVisual();

}
