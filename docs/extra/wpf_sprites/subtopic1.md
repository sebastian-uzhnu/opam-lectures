---
sidebar_position: 2
---

# Анімація ходьби: клас SpriteAnimator

## Архітектура спрайтової анімації

Розіб'ємо задачу на частини:

```
BitmapImage (аркуш)
    └── SpriteAnimator          ← знає про кадри і час
            ├── currentFrame    ← який кадр зараз
            ├── DispatcherTimer ← рахує час між кадрами
            └── Image (WPF)     ← куди виводить CroppedBitmap
```

## Опис спрайт-аркуша

Перш ніж писати код, потрібно описати структуру нашого аркуша. Типовий RPG-персонаж має 4 напрямки ходьби по 3–4 кадри кожен:

```
hero_spritesheet.png (192×256 px, кадри 48×64)

Ряд 0 (y=0):   [вниз_0] [вниз_1] [вниз_2]    ← ходьба вниз
Ряд 1 (y=64):  [вліво_0][вліво_1][вліво_2]   ← ходьба вліво
Ряд 2 (y=128): [вправо_0][вправо_1][вправо_2] ← ходьба вправо
Ряд 3 (y=192): [вгору_0][вгору_1][вгору_2]   ← ходьба вгору
```

```csharp
public enum Direction { Down = 0, Left = 1, Right = 2, Up = 3 }
```

## Клас SpriteSheet

```csharp
public class SpriteSheet
{
    public BitmapImage Bitmap     { get; }
    public int         FrameWidth { get; }
    public int         FrameHeight{ get; }
    public int         Columns    { get; }
    public int         Rows       { get; }

    public SpriteSheet(string resourcePath, int frameWidth, int frameHeight)
    {
        Bitmap      = new BitmapImage(new Uri(resourcePath));
        FrameWidth  = frameWidth;
        FrameHeight = frameHeight;
        Columns     = (int)(Bitmap.PixelWidth  / frameWidth);
        Rows        = (int)(Bitmap.PixelHeight / frameHeight);
    }

    /// <summary>
    /// Повертає CroppedBitmap для кадру (col, row)
    /// </summary>
    public CroppedBitmap GetFrame(int col, int row)
    {
        return new CroppedBitmap(Bitmap,
            new Int32Rect(col * FrameWidth, row * FrameHeight,
                          FrameWidth, FrameHeight));
    }
}
```

## Клас SpriteAnimator

```csharp
public class SpriteAnimator
{
    private readonly SpriteSheet    _sheet;
    private readonly Image          _target;   // WPF Image для виводу
    private readonly DispatcherTimer _timer;

    private int _currentCol;   // поточний кадр у ряду
    private int _currentRow;   // поточний ряд (напрямок)
    private int _frameCount;   // кількість кадрів в анімації

    public bool IsAnimating => _timer.IsEnabled;

    public SpriteAnimator(SpriteSheet sheet, Image target, int fps = 8)
    {
        _sheet  = sheet;
        _target = target;

        _timer = new DispatcherTimer
        {
            Interval = TimeSpan.FromMilliseconds(1000.0 / fps)
        };
        _timer.Tick += OnTick;
    }

    /// <summary>
    /// Запускає анімацію: row — ряд аркуша, frameCount — кількість кадрів у ряду
    /// </summary>
    public void Play(int row, int frameCount)
    {
        if (_currentRow == row && _timer.IsEnabled)
            return; // вже грає цей самий ряд

        _currentRow   = row;
        _frameCount   = frameCount;
        _currentCol   = 0;
        _timer.Start();
        ShowCurrentFrame();
    }

    /// <summary>
    /// Зупиняє анімацію та показує стоп-кадр (перший кадр ряду)
    /// </summary>
    public void Stop()
    {
        _timer.Stop();
        _currentCol = 0;
        ShowCurrentFrame();
    }

    private void OnTick(object sender, EventArgs e)
    {
        _currentCol = (_currentCol + 1) % _frameCount;
        ShowCurrentFrame();
    }

    private void ShowCurrentFrame()
    {
        _target.Source = _sheet.GetFrame(_currentCol, _currentRow);
    }
}
```

## Використання у MainWindow

**XAML:**
```xml
<Canvas x:Name="GameCanvas" Background="#1a1a2e"
        Focusable="True"
        KeyDown="OnKeyDown"
        KeyUp="OnKeyUp">

    <!-- Персонаж -->
    <Image x:Name="HeroImage"
           Width="48" Height="64"
           Canvas.Left="200" Canvas.Top="200"
           RenderOptions.BitmapScalingMode="NearestNeighbor"/>
</Canvas>
```

:::tip NearestNeighbor
`RenderOptions.BitmapScalingMode="NearestNeighbor"` вимикає розмиття при масштабуванні піксельних (pixel art) зображень. Без нього WPF застосовує білінійну фільтрацію і кадри виглядають нечітко.
:::

**C#:**
```csharp
public partial class MainWindow : Window
{
    private SpriteSheet    _sheet;
    private SpriteAnimator _animator;

    // Позиція персонажа
    private double _heroX = 200, _heroY = 200;
    private const double Speed = 3; // пікселів за кадр

    // Стан клавіш (яка зараз натиснута)
    private readonly HashSet<Key> _pressedKeys = new();

    // Ігровий таймер (оновлення позиції)
    private DispatcherTimer _gameTimer;

    public MainWindow()
    {
        InitializeComponent();
        Loaded += OnLoaded;
    }

    private void OnLoaded(object sender, RoutedEventArgs e)
    {
        // Завантажуємо спрайт-аркуш
        // "pack://application:,,,/Assets/hero.png" — шлях до ресурсу
        _sheet    = new SpriteSheet("pack://application:,,,/Assets/hero.png",
                                     frameWidth: 48, frameHeight: 64);
        _animator = new SpriteAnimator(_sheet, HeroImage, fps: 8);

        // Показуємо стоп-кадр (вниз, кадр 0)
        _animator.Play(row: (int)Direction.Down, frameCount: 3);
        _animator.Stop();

        // Ігровий цикл
        _gameTimer = new DispatcherTimer
        {
            Interval = TimeSpan.FromMilliseconds(16) // ~60 FPS
        };
        _gameTimer.Tick += OnGameTick;
        _gameTimer.Start();

        // Фокус на Canvas для отримання клавіатурних подій
        GameCanvas.Focus();
    }

    private void OnGameTick(object sender, EventArgs e)
    {
        bool moving = false;

        if (_pressedKeys.Contains(Key.Left) || _pressedKeys.Contains(Key.A))
        {
            _heroX -= Speed;
            _animator.Play((int)Direction.Left, frameCount: 3);
            moving = true;
        }
        else if (_pressedKeys.Contains(Key.Right) || _pressedKeys.Contains(Key.D))
        {
            _heroX += Speed;
            _animator.Play((int)Direction.Right, frameCount: 3);
            moving = true;
        }
        else if (_pressedKeys.Contains(Key.Up) || _pressedKeys.Contains(Key.W))
        {
            _heroY -= Speed;
            _animator.Play((int)Direction.Up, frameCount: 3);
            moving = true;
        }
        else if (_pressedKeys.Contains(Key.Down) || _pressedKeys.Contains(Key.S))
        {
            _heroY += Speed;
            _animator.Play((int)Direction.Down, frameCount: 3);
            moving = true;
        }

        if (!moving)
            _animator.Stop();

        // Обмежуємо межами Canvas
        _heroX = Math.Clamp(_heroX, 0, GameCanvas.ActualWidth  - _sheet.FrameWidth);
        _heroY = Math.Clamp(_heroY, 0, GameCanvas.ActualHeight - _sheet.FrameHeight);

        // Оновлюємо позицію Image на Canvas
        Canvas.SetLeft(HeroImage, _heroX);
        Canvas.SetTop (HeroImage, _heroY);
    }

    private void OnKeyDown(object sender, KeyEventArgs e) => _pressedKeys.Add(e.Key);
    private void OnKeyUp  (object sender, KeyEventArgs e) => _pressedKeys.Remove(e.Key);
}
```

## Чому HashSet для клавіш

У Windows натискання клавіші генерує події `KeyDown` з авто-повтором. Якщо використовувати просту змінну `bool isMoving`, рух буде переривчастим. `HashSet<Key>` дозволяє:

1. Тримати кілька кнопок одночасно (діагональний рух)
2. Уникати авто-повторних спрацювань
3. Перевіряти стан клавіш у ігровому циклі, а не в обробнику подій

```csharp
// Перевірка кількох кнопок одночасно (діагональний рух)
bool goLeft  = _pressedKeys.Contains(Key.Left) || _pressedKeys.Contains(Key.A);
bool goRight = _pressedKeys.Contains(Key.Right) || _pressedKeys.Contains(Key.D);
bool goUp    = _pressedKeys.Contains(Key.Up)   || _pressedKeys.Contains(Key.W);
bool goDown  = _pressedKeys.Contains(Key.Down) || _pressedKeys.Contains(Key.S);

if (goLeft)  { _heroX -= Speed; direction = Direction.Left; }
if (goRight) { _heroX += Speed; direction = Direction.Right; }
if (goUp)    { _heroY -= Speed; direction = Direction.Up; }
if (goDown)  { _heroY += Speed; direction = Direction.Down; }
```
