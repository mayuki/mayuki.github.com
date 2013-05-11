"use strict";

window.addEventListener('DOMContentLoaded', function () {
    setupDragAndDrop();
    setupFilePicker();
    setupCanvas();
});


/* =====================================================================
 * Pointer Events: (絵を描ける機能)
 * ===================================================================== */
function setupCanvas() {
    var canvasE = document.querySelector('#paint-canvas');
    var ctx = canvasE.getContext('2d');
    ctx.strokeStyle = 'red';
    ctx.lineWidth   = 10;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';

    var isPointerDowned = false;
    canvasE.addEventListener('MSPointerDown', function (e) {
        e.preventDefault();
        isPointerDowned = true;
        ctx.beginPath();
        ctx.moveTo(e.offsetX, e.offsetY);
    });
    canvasE.addEventListener('MSPointerMove', function (e) {
        if (!isPointerDowned) return;

        ctx.lineWidth = 5 + (15 * e.pressure-0.5);
        console.log(e.pressure);

        e.preventDefault();
        //ctx.fillRect(e.clientX, e.offsetY, 5, 5);
        ctx.lineTo(e.offsetX, e.offsetY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(e.offsetX, e.offsetY);
    });
    canvasE.addEventListener('MSPointerUp', function (e) {
        isPointerDowned = false;
    });
}


/* =====================================================================
 * MSGesture*: ジェスチャー関連
 * ===================================================================== */
function attachGestures(target) {
    var gesture = new MSGesture();
    gesture.target = target;
    gesture.target.addEventListener('MSPointerDown', function (e) {
        e.preventDefault();
        gesture.addPointer(e.pointerId);
    });

    gesture.target.addEventListener('MSGestureChange', function (e) {
        var matrix = new MSCSSMatrix(e.target.style.msTransform);
        e.target.style.msTransform = matrix
            .translate(e.translationX, e.translationY)
            .rotate(e.rotation * 180 / Math.PI)
            .scale(e.scale)
        ;
    });

    gesture.target.addEventListener('MSGestureHold', function (e) {
        if (e.detail == e.MSGESTURE_FLAG_BEGIN) {
            e.preventDefault();
            e.target.classList.add('remove');
            e.target.addEventListener('animationend', function (e) {
                e.target.parentNode.removeChild(e.target);
            });
        }
    });
    gesture.target.addEventListener("contextmenu", function(e) { e.preventDefault(); }, false);
    gesture.target.addEventListener("MSHoldVisual", function(e) { e.preventDefault(); }, false);
}

/* =====================================================================
 * Drag and Drop/File API: ドラッグアンドドロップとファイル選択による読み込み
 * ===================================================================== */
function setupFilePicker() {
    var inputE = document.querySelector('#filePicker');
    inputE.addEventListener('change', function (e) {
        loadImagesFromFiles(e.target.files, 1366/2, 768/2);
    });
}
function setupDragAndDrop() {
    var stageE = document.querySelector('#stage');
    stageE.addEventListener('drop', function (e) {
        e.preventDefault();
        e.stopPropagation();

        // ファイルを読み込む
        loadImagesFromFiles(e.dataTransfer.files, e.clientX, e.clientY);
    });
    stageE.addEventListener('dragenter', function (e) {
        e.preventDefault();
        e.stopPropagation();
    });
    stageE.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
    });
}
/*
 * FileList (File API)から画像ファイルを読み込む
 * 画像のジェスチャー操作もここで付けるよう呼び出す。
 */
function loadImagesFromFiles(files, baseX, baseY) {
    // 画像を配置するための div 要素
    var imagesE = document.querySelector('#images');

    for (var i = 0; i < files.length; i++) {
        // 読み込んだファイルを表示するための img 要素を作成して、div 要素に追加する。
        var imgE = document.createElement('img');
        imgE.classList.add('image-item');

        // ジェスチャーに反応するように設定する
        attachGestures(imgE);
        // div 要素に追加
        imagesE.appendChild(imgE);

        (function (imgE) {
            // ファイルを読み込むためのFileReaderクラスのオブジェクトを作成。
            var reader = new FileReader();
            // ファイルのデータを読み込み終わった時の処理を設定
            reader.onloadend = function () {
                // ファイルのデータを読み込み終わるとFileReaderのresultプロパティにData URLでデータが格納されるので img 要素の src 属性にセットする。
                // img 要素で読み込みが終わった際にの処理として、表示用のclassを付けて場所もサイズから決定するようにする。
                imgE.onload = function () {
                    imgE.classList.add('show');
                    imgE.style.left = baseX + (i * 10) - (imgE.width/2) + 'px';
                    imgE.style.top  = baseY + (i * 10) - (imgE.height / 2) + 'px';
                }
                // img 要素の src 属性にデータをセット。
                imgE.src = reader.result;
            }
            // FileReaderで読み込んでData URLとして取得する。
            reader.readAsDataURL(files[i]);
        })(imgE);
    }
}


/* =====================================================================
 * Web Workers: セピア調にする処理
 * ===================================================================== */
var processingCount = 0;
function processImages() {
    [].forEach.call(document.querySelectorAll('#stage img'), function (target) {
        processSepiaImageWithWorkers(target);
    });
}
function processSepiaImageWithWorkers (imageE) {
    document.body.classList.add('processing');
    processingCount++;

    var canvasE = document.createElement('canvas');
    canvasE.width  = imageE.naturalWidth;
    canvasE.height = imageE.naturalHeight;

    var ctx = canvasE.getContext('2d');
    ctx.drawImage(imageE, 0, 0);

    var imageData = ctx.getImageData(0, 0, canvasE.width, canvasE.height);
    var worker = new Worker("js/worker.js");

    worker.addEventListener('message', function (e) {
        ctx.putImageData(e.data, 0, 0);
        imageE.src = canvasE.toDataURL('image/png');

        processingCount--;
        if (processingCount == 0) {
            document.body.classList.remove('processing');
        }
    });
    worker.postMessage(imageData);
}

/* =====================================================================
 * msSaveBlob: 画像をローカルに保存する処理
 * ===================================================================== */
function saveToLocal() {
    var canvasE = document.createElement('canvas');
    canvasE.width  = 1366;
    canvasE.height = 768;
    var ctx = canvasE.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvasE.width, canvasE.height);

    var images = document.querySelectorAll('.image-item');
    for (var i = 0; i < images.length; i++) {
        var imageE = images[i];
        var computedStyle = window.getComputedStyle(imageE);
        var width = computedStyle.width.replace(/px/, '');
        var height = computedStyle.height.replace(/px/, '');
        ctx.save();

        ctx.translate(width / 2, height / 2); // CSS3のtransform-originは中央がデフォルト、Canvas 2Dのoriginは0,0がデフォルトなので移動して合わせる
        if (computedStyle.msTransform.match(/matrix/)) {
            // CSSで適用されているtransformのmatrixをCanvasにもまるごと適用する
            var matrix = computedStyle.msTransform.match(/matrix\(([^)]+)\)/)[1].split(/\s*,\s*/);
            ctx.transform.apply(ctx, matrix);
        }
        ctx.translate(-width / 2, -height / 2); // originを戻す

        ctx.drawImage(imageE, computedStyle.left.replace(/px/, ''), computedStyle.top.replace(/px/, ''), width, height);

        ctx.restore();
    }

    ctx.drawImage(document.querySelector('#paint-canvas'), 0, 0);

    window.navigator.msSaveBlob(canvasE.msToBlob(), 'Image-' + (new Date().valueOf()) + '.png');
}
