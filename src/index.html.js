export const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1" />
    <title>Unicorn Sticker Lab</title>
</head>
<body>
    <canvas id="bgDrift"></canvas>
    <div id="app">
        <div id="header">
            <span id="discoveryCount"></span>
            <button id="collectionBtn">Collection</button>
            <button id="albumBtn">Album</button>
            <button id="muteBtn" title="Mute music">&#9834;</button>
        </div>
        <div id="request"></div>
        <div id="stage">
            <canvas id="mascot" title="Your studio mascot"></canvas>
            <canvas id="c"></canvas>
            <div id="toast"></div>
        </div>
        <div id="printRow">
            <button id="printBtn" title="Print your sticker - combines overlapping pieces, clears the rest"><svg viewBox="0 0 16 16" width="14" height="14"><path d="M4 1h8v4H4zM2 5h12a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-2v-3H4v3H2a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM4 11h8v4H4z" fill="none" stroke="currentColor" stroke-width="1.3"/></svg> Print</button>
            <button id="clearBtn" title="Clear the whole canvas"><svg viewBox="0 0 16 16" width="14" height="14"><path d="M3 4h10M6 4V2h4v2M5 4l1 10h4l1-10" fill="none" stroke="currentColor" stroke-width="1.3"/></svg> Clear</button>
        </div>
        <div id="toolbar">
            <button class="edit-only" data-act="rotL" title="Rotate left">&#8634;</button>
            <button class="edit-only" data-act="rotR" title="Rotate right">&#8635;</button>
            <button class="edit-only" data-act="scaleDown" title="Smaller">&minus;</button>
            <button class="edit-only" data-act="scaleUp" title="Bigger">&plus;</button>
            <button class="edit-only" data-act="flip" title="Flip">&#8646;</button>
            <button class="edit-only" data-act="back" title="Send back">&#8659;</button>
            <button class="edit-only" data-act="front" title="Bring forward">&#8657;</button>
            <button class="edit-only" data-act="dup" title="Duplicate">&#10697;</button>
            <button data-act="del" title="Delete">&#10005;</button>
        </div>
        <div id="colors"></div>
        <div id="effects"></div>
        <div id="tray"></div>
        <div id="collection" class="hidden">
            <div id="collectionPanel">
                <button id="collectionClose" title="Close">&#10005;</button>
                <h1>Collection</h1>
                <div id="collectionList"></div>
                <button id="resetBtn" title="Erase every discovered recipe and unlocked piece">Reset Progress</button>
            </div>
        </div>
        <div id="album" class="hidden">
            <div id="albumPanel">
                <button id="albumClose" title="Close">&#10005;</button>
                <h1>Album</h1>
                <div id="albumGrid"></div>
            </div>
        </div>
        <div id="confirm" class="hidden">
            <div id="confirmPanel">
                <p id="confirmText"></p>
                <div id="confirmButtons">
                    <button id="confirmYes">Yes</button>
                    <button id="confirmNo">No</button>
                </div>
            </div>
        </div>
        <div id="title">
            <canvas id="titleCanvas" width="280" height="170"></canvas>
            <h1>Unicorn Sticker Lab</h1>
            <p>Design magical stickers. Discover the secret combos.</p>
            <button id="startBtn">Start</button>
        </div>
    </div>
</body>
</html>
`
