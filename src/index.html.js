export const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1" />
    <title>Unicorn Sticker Lab</title>
</head>
<body>
    <div id="app">
        <div id="header">
            <span id="discoveryCount"></span>
            <button id="collectionBtn">Collection</button>
        </div>
        <div id="request"></div>
        <div id="stage">
            <canvas id="mascot" title="Your studio mascot"></canvas>
            <canvas id="c"></canvas>
            <div id="toast"></div>
        </div>
        <button id="printBtn" title="Print your sticker - combines overlapping pieces, clears the rest">&#128424; Print</button>
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
            </div>
        </div>
    </div>
</body>
</html>
`
