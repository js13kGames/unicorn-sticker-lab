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
        <div id="stage">
            <canvas id="mascot" title="Your studio mascot"></canvas>
            <canvas id="c"></canvas>
            <div id="toast"></div>
        </div>
        <div id="toolbar">
            <button data-act="rotL" title="Rotate left">&#8634;</button>
            <button data-act="rotR" title="Rotate right">&#8635;</button>
            <button data-act="scaleDown" title="Smaller">&minus;</button>
            <button data-act="scaleUp" title="Bigger">&plus;</button>
            <button data-act="flip" title="Flip">&#8646;</button>
            <button data-act="back" title="Send back">&#8659;</button>
            <button data-act="front" title="Bring forward">&#8657;</button>
            <button data-act="dup" title="Duplicate">&#10697;</button>
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
