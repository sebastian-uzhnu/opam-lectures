---
sidebar_position: 4
---

# Повний ігровий приклад: персонаж на карті

## Архітектура фінального проекту

```
MainWindow
├── GameCanvas (Canvas)
│   ├── mapImage (Image)          ← карта, малюється один раз
│   └── HeroImage (Image)         ← спрайт персонажа поверх карти
│
├── SpriteSheet  _heroSheet       ← завантажений аркуш
├── SpriteSheet  _tileSheet       ← завантажений тайлсет
├── SpriteAnimator _animator      ← керує кадрами персонажа
├── Tilemap      _map             ← дані карти + колізії
├── DispatcherTimer _gameTimer    ← ігровий цикл ~60 FPS
└── HashSet<Key> _pressedKeys     ← стан клавіатури
```

## XAML

```xml
<Window x:Class="SpriteDemo.MainWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Sprite Demo" Height="520" Width="720"
        Background="#0a0a1a"
        KeyDown="OnKeyDown" KeyUp="OnKeyUp">

    <DockPanel>
        <!-- HUD зверху -->
        <Border DockPanel.Dock="Top" Background="#12122a" Padding="8,4">
            <StackPanel Orientation="Horizontal">
                <TextBlock x:Name="PosText" Foreground="#aaa" FontFamily="Consolas"
                           Text="Позиція: (0, 0)"/>
                <TextBlock Foreground="#444" Margin="12,0" Text="|"/>
                <TextBlock Foreground="#666" FontFamily="Consolas"
                           Text="WASD або стрілки — рух"/>
            </StackPanel>
        </Border>

        <!--Ігрове поле -->
        <Canvas x:Name="GameCanvas"
                Background="#1a1a2e"
                ClipToBounds="True"
                Focusable="True"/>
    </DockPanel>
</Window>
```

## Code-behind: повний код

```csharp
using System;
using System.Collections.Generic;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Shapes;
using System.Windows.Threading;

namespace SpriteDemo
{
    public partial class MainWindow : Window
    {
        // ── Ресурси ──────────────────────────────────────────────────
        private SpriteSheet    _heroSheet;
        private SpriteSheet    _tileSheet;
        private SpriteAnimator _animator;
        private Tilemap        _map;

        // ── WPF-елементи ─────────────────────────────────────────────
        private Image _heroImage;
        private Image _mapImage;

        // ── Стан гри ─────────────────────────────────────────────────
        private double _heroX = 64, _heroY = 64;
        private Direction _facing = Direction.Down;
        private const double Speed = 2.5;

        private readonly HashSet<Key> _pressedKeys = new();
        private DispatcherTimer _gameTimer;

        // ── Карта ─────────────────────────────────────────────────────
        private static readonly int[,] MapData =
        {
            { 3,3,3,3,3,3,3,3,3,3,3,3,3,3,3 },
            { 3,0,0,0,0,0,0,0,0,0,0,0,0,0,3 },
            { 3,0,4,0,0,0,0,0,0,0,4,4,0,0,3 },
            { 3,0,0,0,0,1,1,1,0,0,0,0,0,0,3 },
            { 3,0,0,0,0,1,1,1,0,0,0,0,0,0,3 },
            { 3,0,0,0,0,0,0,0,0,4,0,0,0,0,3 },
            { 3,0,0,4,0,0,0,0,0,0,0,0,0,0,3 },
            { 3,0,0,0,0,0,0,0,0,0,0,0,4,0,3 },
            { 3,0,0,0,0,0,0,0,0,0,0,0,0,0,3 },
            { 3,3,3,3,3,3,3,3,3,3,3,3,3,3,3 },
        };
        // ────────────────────────────────────────────────────────────

        public MainWindow()
        {
            InitializeComponent();
            Loaded += OnLoaded;
        }

        private void OnLoaded(object sender, RoutedEventArgs e)
        {
            LoadResources();
            BuildMap();
            BuildHero();
            StartGameLoop();
            GameCanvas.Focus();
        }

        // ── Ініціалізація ────────────────────────────────────────────

        private void LoadResources()
        {
            // Спрайт-аркуш персонажа: 48×64 кадри, 3 стовпці, 4 ряди
            _heroSheet = new SpriteSheet(
                "pack://application:,,,/Assets/hero.png",
                frameWidth: 48, frameHeight: 64);

            // Тайлсет: 32×32 тайли, один ряд
            _tileSheet = new SpriteSheet(
                "pack://application:,,,/Assets/tileset.png",
                frameWidth: 32, frameHeight: 32);
        }

        private void BuildMap()
        {
            _map = new Tilemap(MapData, _tileSheet);

            // Рендеримо карту у один Image (оптимізація)
            _mapImage = new Image
            {
                Source = _map.RenderToImage(),
                Width  = _map.Cols * _map.TileWidth,
                Height = _map.Rows * _map.TileHeight,
                RenderOptions = { BitmapScalingMode = BitmapScalingMode.NearestNeighbor }
            };
            Canvas.SetLeft(_mapImage, 0);
            Canvas.SetTop (_mapImage, 0);
            Panel.SetZIndex(_mapImage, 0); // карта під персонажем
            GameCanvas.Children.Add(_mapImage);
        }

        private void BuildHero()
        {
            _heroImage = new Image
            {
                Width  = _heroSheet.FrameWidth,
                Height = _heroSheet.FrameHeight,
                RenderOptions = { BitmapScalingMode = BitmapScalingMode.NearestNeighbor }
            };
            Panel.SetZIndex(_heroImage, 10); // поверх карти
            GameCanvas.Children.Add(_heroImage);

            _animator = new SpriteAnimator(_heroSheet, _heroImage, fps: 8);
            UpdateHeroPosition();

            // Стоп-кадр: обличчям вниз
            _animator.Play((int)Direction.Down, frameCount: 3);
            _animator.Stop();
        }

        private void StartGameLoop()
        {
            _gameTimer = new DispatcherTimer
            {
                Interval = TimeSpan.FromMilliseconds(16)
            };
            _gameTimer.Tick += OnGameTick;
            _gameTimer.Start();
        }

        // ── Ігровий цикл ─────────────────────────────────────────────

        private void OnGameTick(object sender, EventArgs e)
        {
            double dx = 0, dy = 0;

            if (_pressedKeys.Contains(Key.Left)  || _pressedKeys.Contains(Key.A))
                { dx = -Speed; _facing = Direction.Left; }
            else if (_pressedKeys.Contains(Key.Right) || _pressedKeys.Contains(Key.D))
                { dx =  Speed; _facing = Direction.Right; }

            if (_pressedKeys.Contains(Key.Up)   || _pressedKeys.Contains(Key.W))
                { dy = -Speed; _facing = Direction.Up; }
            else if (_pressedKeys.Contains(Key.Down) || _pressedKeys.Contains(Key.S))
                { dy =  Speed; _facing = Direction.Down; }

            bool moving = dx != 0 || dy != 0;

            if (moving)
            {
                // Перевіряємо колізії окремо по осях
                double newX = _heroX + dx;
                double newY = _heroY + dy;

                if (CanMoveTo(newX, _heroY))
                    _heroX = newX;

                if (CanMoveTo(_heroX, newY))
                    _heroY = newY;

                _animator.Play((int)_facing, frameCount: 3);
            }
            else
            {
                _animator.Stop();
            }

            UpdateHeroPosition();

            // Оновлюємо HUD
            int tileCol = (int)(_heroX / _map.TileWidth);
            int tileRow = (int)(_heroY / _map.TileHeight);
            PosText.Text = $"Позиція: ({tileCol}, {tileRow})  |  px: ({(int)_heroX}, {(int)_heroY})";
        }

        // ── Допоміжні методи ─────────────────────────────────────────

        private void UpdateHeroPosition()
        {
            Canvas.SetLeft(_heroImage, _heroX);
            Canvas.SetTop (_heroImage, _heroY);
        }

        private bool CanMoveTo(double x, double y)
        {
            int pad = 6; // відступ хітбоксу від краю спрайта
            int halfH = _heroSheet.FrameHeight / 2;

            // Перевіряємо 4 кути нижньої половини спрайта (ноги)
            return IsTileWalkable(x + pad,                      y + halfH)
                && IsTileWalkable(x + _heroSheet.FrameWidth - pad - 1, y + halfH)
                && IsTileWalkable(x + pad,                      y + _heroSheet.FrameHeight - 2)
                && IsTileWalkable(x + _heroSheet.FrameWidth - pad - 1, y + _heroSheet.FrameHeight - 2);
        }

        private bool IsTileWalkable(double px, double py)
        {
            int col = (int)(px / _map.TileWidth);
            int row = (int)(py / _map.TileHeight);

            if (col < 0 || col >= _map.Cols || row < 0 || row >= _map.Rows)
                return false;

            return TileProperties.IsWalkable(_map.GetTile(col, row));
        }

        // ── Клавіатура ───────────────────────────────────────────────

        private void OnKeyDown(object sender, KeyEventArgs e) => _pressedKeys.Add(e.Key);
        private void OnKeyUp  (object sender, KeyEventArgs e) => _pressedKeys.Remove(e.Key);
    }

    // ── Допоміжні класи ──────────────────────────────────────────────

    public enum Direction { Down = 0, Left = 1, Right = 2, Up = 3 }

    public class SpriteSheet
    {
        public BitmapImage Bitmap      { get; }
        public int         FrameWidth  { get; }
        public int         FrameHeight { get; }
        public int         Columns     { get; }
        public int         Rows        { get; }

        public SpriteSheet(string uri, int frameWidth, int frameHeight)
        {
            Bitmap      = new BitmapImage(new Uri(uri));
            FrameWidth  = frameWidth;
            FrameHeight = frameHeight;
            Columns     = Bitmap.PixelWidth  / frameWidth;
            Rows        = Bitmap.PixelHeight / frameHeight;
        }

        public CroppedBitmap GetFrame(int col, int row)
            => new CroppedBitmap(Bitmap,
                   new Int32Rect(col * FrameWidth, row * FrameHeight,
                                 FrameWidth, FrameHeight));
    }

    public class SpriteAnimator
    {
        private readonly SpriteSheet     _sheet;
        private readonly Image           _target;
        private readonly DispatcherTimer _timer;

        private int _col, _row, _frameCount;

        public SpriteAnimator(SpriteSheet sheet, Image target, int fps)
        {
            _sheet  = sheet;
            _target = target;
            _timer  = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(1000.0 / fps) };
            _timer.Tick += (_, _) => { _col = (_col + 1) % _frameCount; Show(); };
        }

        public void Play(int row, int frameCount)
        {
            if (_row == row && _timer.IsEnabled) return;
            _row = row; _frameCount = frameCount; _col = 0;
            _timer.Start();
            Show();
        }

        public void Stop()
        {
            _timer.Stop();
            _col = 0;
            Show();
        }

        private void Show() => _target.Source = _sheet.GetFrame(_col, _row);
    }

    public class Tilemap
    {
        private readonly int[,]     _data;
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

        public ImageSource RenderToImage()
        {
            var dv = new DrawingVisual();
            using (var dc = dv.RenderOpen())
            {
                for (int r = 0; r < Rows; r++)
                for (int c = 0; c < Cols; c++)
                {
                    var frame = _tileset.GetFrame(_data[r, c], 0);
                    dc.DrawImage(frame, new Rect(c * TileWidth, r * TileHeight,
                                                  TileWidth, TileHeight));
                }
            }
            var rtb = new RenderTargetBitmap(
                Cols * TileWidth, Rows * TileHeight, 96, 96, PixelFormats.Pbgra32);
            rtb.Render(dv);
            return rtb;
        }
    }

    public static class TileProperties
    {
        private static readonly Dictionary<int, bool> _walkable = new()
        {
            { 0, true  },  // трава
            { 1, false },  // вода
            { 2, true  },  // пісок
            { 3, false },  // стіна
            { 4, false },  // дерево
        };

        public static bool IsWalkable(int id)
            => _walkable.TryGetValue(id, out bool w) && w;
    }
}
```

## Порядок Z-індексів

У WPF `Canvas` малює дочірні елементи у порядку їх додавання (FIFO). Щоб гарантувати, що персонаж завжди поверх карти — використовуємо `Panel.ZIndex`:

```csharp
Panel.SetZIndex(mapImage,  0);   // карта — найнижче
Panel.SetZIndex(heroImage, 10);  // персонаж — поверх
// Якщо додати НПЦ:
Panel.SetZIndex(npcImage,  5);   // між картою та головним персонажем
```

## Камера (прокрутка карти)

Якщо карта більша за вікно, потрібна камера — зміщення всього вмісту Canvas:

```csharp
private void UpdateCamera()
{
    // Центруємо камеру на персонажі
    double camX = _heroX - GameCanvas.ActualWidth  / 2;
    double camY = _heroY - GameCanvas.ActualHeight / 2;

    // Обмежуємо межами карти
    double mapPixelW = _map.Cols * _map.TileWidth;
    double mapPixelH = _map.Rows * _map.TileHeight;
    camX = Math.Clamp(camX, 0, Math.Max(0, mapPixelW - GameCanvas.ActualWidth));
    camY = Math.Clamp(camY, 0, Math.Max(0, mapPixelH - GameCanvas.ActualHeight));

    // Застосовуємо зміщення через TranslateTransform до вмісту Canvas
    _worldTransform.X = -camX;
    _worldTransform.Y = -camY;
}
```

```xml
<!-- Огорнути весь вміст у ContentContainer з TranslateTransform -->
<Canvas x:Name="GameCanvas" ClipToBounds="True">
    <Canvas x:Name="WorldContainer">
        <Canvas.RenderTransform>
            <TranslateTransform x:Name="WorldTransform"/>
        </Canvas.RenderTransform>
        <!-- Сюди додаємо mapImage та heroImage -->
    </Canvas>
</Canvas>
```

```csharp
private TranslateTransform _worldTransform;

private void OnLoaded(...)
{
    _worldTransform = (TranslateTransform)WorldContainer.RenderTransform;
    // ...
}
```

## Масштабування (Zoom)

Щоб збільшити піксель-арт у 2–3 рази (pixel-perfect scaling):

```xml
<Canvas x:Name="WorldContainer">
    <Canvas.RenderTransform>
        <TransformGroup>
            <TranslateTransform x:Name="WorldTransform"/>
            <ScaleTransform ScaleX="2" ScaleY="2"/>
        </TransformGroup>
    </Canvas.RenderTransform>
</Canvas>
```

Або через `LayoutTransform` на `Canvas`, щоб WPF враховував масштаб при розрахунку розмірів.

---

## Покроковий план реалізації свого проекту

1. **Знайти або намалювати спрайт-аркуш** — [Kenney.nl](https://kenney.nl/assets), [itch.io](https://itch.io/game-assets/free)
2. **Визначити розмір кадру** — відкрити у Photoshop/GIMP, порахувати пікселі
3. **Додати PNG у Assets** → `Build Action = Resource`
4. **Реалізувати `SpriteSheet` та `SpriteAnimator`** — з розділу 2
5. **Намалювати карту** — масив `int[,]`, знайти тайлсет
6. **Реалізувати `Tilemap`** — `RenderToImage()` для оптимізації
7. **Підключити колізії** — `CanMoveTo()` з перевіркою кутів
8. **Додати камеру** — `TranslateTransform` якщо карта велика
9. **Масштабувати** — `ScaleTransform` для pixel-perfect збільшення
