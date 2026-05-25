---
sidebar_position: 3
---

# Тайлова карта: малювання ігрового світу

## Що таке тайлова карта

**Тайл** (tile) — маленький квадратний блок (зазвичай 16×16, 32×32 або 48×48 пікселів), з яких будується ігровий світ як мозаїка. **Тайлова карта** — двовимірний масив чисел, де кожне число означає тип тайла.

```
Масив карти:          Відображення:
0 0 0 0 0 0           ~ ~ ~ ~ ~ ~   (0 = вода)
0 1 1 1 1 0           ~ # # # # ~   (1 = трава)
0 1 2 1 1 0           ~ # T # # ~   (2 = дерево)
0 1 1 1 2 0           ~ # # # T ~
0 0 0 0 0 0           ~ ~ ~ ~ ~ ~
```

## Завантаження тайл-аркуша

Тайли зберігаються так само — в одному аркуші:

```
tileset.png (96×16 px, тайли 16×16)
┌────────┬────────┬────────┬────────┬────────┬────────┐
│ трава  │ вода   │ пісок  │ камінь │ дерево │ стіна  │
│  (0)   │  (1)   │  (2)   │  (3)   │  (4)   │  (5)   │
└────────┴────────┴────────┴────────┴────────┴────────┘
```

## Клас Tilemap

```csharp
public class Tilemap
{
    private readonly int[,] _data;      // масив тайлів
    private readonly SpriteSheet _tileset;

    public int TileWidth  => _tileset.FrameWidth;
    public int TileHeight => _tileset.FrameHeight;
    public int Cols       => _data.GetLength(1);
    public int Rows       => _data.GetLength(0);

    public Tilemap(int[,] data, SpriteSheet tileset)
    {
        _data    = data;
        _tileset = tileset;
    }

    public int GetTile(int col, int row) => _data[row, col];

    /// <summary>
    /// Малює всю карту на Canvas
    /// </summary>
    public void Render(Canvas canvas)
    {
        canvas.Children.Clear();

        for (int row = 0; row < Rows; row++)
        for (int col = 0; col < Cols; col++)
        {
            int tileId = _data[row, col];

            var img = new Image
            {
                Width  = TileWidth,
                Height = TileHeight,
                Source = _tileset.GetFrame(tileId, 0), // тайли в одному ряду
                RenderOptions = { BitmapScalingMode = BitmapScalingMode.NearestNeighbor }
            };

            // Встановлюємо позицію тайла
            Canvas.SetLeft(img, col * TileWidth);
            Canvas.SetTop (img, row * TileHeight);

            canvas.Children.Add(img);
        }
    }
}
```

:::warning Продуктивність
`Render()` вище перестворює всі `Image`-елементи щоразу. Для статичної карти це нормально — викликаємо один раз при запуску. Для великих карт (100×100 = 10 000 тайлів) краще використовувати `DrawingVisual` або `WriteableBitmap` для відмалювання всієї карти в один прохід (розглянуто в кінці розділу).
:::

## Визначення прохідності тайлів

Не всі тайли можна пересікати. Зберігаємо це у словнику:

```csharp
public static class TileProperties
{
    // true = можна ходити, false = стіна/перешкода
    private static readonly Dictionary<int, bool> _walkable = new()
    {
        { 0, true  },  // трава
        { 1, false },  // вода (не прохідна)
        { 2, true  },  // пісок
        { 3, false },  // камінь
        { 4, false },  // дерево
        { 5, false },  // стіна
    };

    public static bool IsWalkable(int tileId)
        => _walkable.TryGetValue(tileId, out bool w) && w;
}
```

## Перевірка колізій персонажа з тайлами

Персонаж займає кілька тайлів одночасно. Перевіряємо всі кути хітбоксу:

```csharp
public bool CanMoveTo(double newX, double newY,
                       int heroWidth, int heroHeight, Tilemap map)
{
    // Хітбокс менший за спрайт (щоб виглядало природно)
    int hitboxPadding = 4;
    double left   = newX + hitboxPadding;
    double right  = newX + heroWidth  - hitboxPadding - 1;
    double top    = newY + heroHeight / 2.0; // нижня половина (ноги)
    double bottom = newY + heroHeight - 1;

    // Перевіряємо 4 кути хітбоксу
    return IsTileWalkable(left,  top,    map)
        && IsTileWalkable(right, top,    map)
        && IsTileWalkable(left,  bottom, map)
        && IsTileWalkable(right, bottom, map);
}

private bool IsTileWalkable(double px, double py, Tilemap map)
{
    int col = (int)(px / map.TileWidth);
    int row = (int)(py / map.TileHeight);

    // Якщо за межами карти — вважаємо стіною
    if (col < 0 || col >= map.Cols || row < 0 || row >= map.Rows)
        return false;

    return TileProperties.IsWalkable(map.GetTile(col, row));
}
```

## Проста демо-карта

```csharp
private static readonly int[,] DemoMap =
{
    { 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3 },
    { 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3 },
    { 3, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4, 0, 3 },
    { 3, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 3 },
    { 3, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 3 },
    { 3, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 3 },
    { 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3 },
    { 3, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 3 },
    { 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3 },
    { 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3 },
};
// 0=трава, 1=вода, 3=стіна, 4=дерево
```

## Ефективне відмалювання великих карт

Для карт, де тайли не змінюються, малюємо все в один `DrawingVisual` і кешуємо:

```csharp
private ImageSource RenderMapToImage(Tilemap map, SpriteSheet tileset)
{
    int totalW = map.Cols * map.TileWidth;
    int totalH = map.Rows * map.TileHeight;

    var drawingVisual = new DrawingVisual();
    using (var dc = drawingVisual.RenderOpen())
    {
        for (int row = 0; row < map.Rows; row++)
        for (int col = 0; col < map.Cols; col++)
        {
            int tileId = map.GetTile(col, row);
            var frame  = tileset.GetFrame(tileId, 0);
            var rect   = new Rect(col * map.TileWidth,
                                   row * map.TileHeight,
                                   map.TileWidth,
                                   map.TileHeight);
            dc.DrawImage(frame, rect);
        }
    }

    // Рендеримо у RenderTargetBitmap — один Image на весь Canvas
    var rtb = new RenderTargetBitmap(totalW, totalH, 96, 96, PixelFormats.Pbgra32);
    rtb.Render(drawingVisual);
    return rtb;
}
```

```csharp
// Один Image для всієї карти — замість тисяч Image-елементів
var mapImage = new Image
{
    Source = RenderMapToImage(tilemap, tileset),
    Width  = tilemap.Cols * tilemap.TileWidth,
    Height = tilemap.Rows * tilemap.TileHeight
};
Canvas.SetLeft(mapImage, 0);
Canvas.SetTop (mapImage, 0);
GameCanvas.Children.Add(mapImage); // завжди перший (під персонажем)
```
