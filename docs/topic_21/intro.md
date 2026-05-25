---
sidebar_position: 1
---

# Спрайти та спрайт-аркуші

## Що таке спрайт

**Спрайт** (sprite) — це двовимірне зображення, що використовується як графічний елемент у грі або анімації. Зазвичай це персонаж, ворог, предмет або частина фону.

**Спрайт-аркуш** (sprite sheet) — це одне велике зображення, що містить **всі кадри** анімації (або декілька анімацій) впритул один до одного. Замість того щоб завантажувати 20 окремих файлів для 20 кадрів ходьби, ми завантажуємо один файл і «вирізаємо» з нього потрібний кадр.

```
┌──────────────────────────────────────────┐
│  Кадр 0  │  Кадр 1  │  Кадр 2  │ Кадр 3 │   ← Ряд "Ходьба вправо"
├──────────────────────────────────────────┤
│  Кадр 0  │  Кадр 1  │  Кадр 2  │ Кадр 3 │   ← Ряд "Ходьба вліво"
├──────────────────────────────────────────┤
│  Кадр 0  │  Кадр 1  │  Кадр 2  │ Кадр 3 │   ← Ряд "Ходьба вгору"
└──────────────────────────────────────────┘
         sprite_sheet.png
```

**Переваги спрайт-аркушів:**
- Одне завантаження замість багатьох файлів
- Менше пам'яті (GPU тримає одну текстуру)
- Простіше керування ресурсами

## Де знайти спрайти

Безкоштовні спрайт-аркуші для навчання:

| Ресурс | Що є |
|---|---|
| [itch.io](https://itch.io/game-assets/free) | Тисячі безкоштовних ігрових ресурсів |
| [OpenGameArt.org](https://opengameart.org) | Відкриті ліцензії, пікселі та вектор |
| [Kenney.nl](https://kenney.nl/assets) | Якісні безкоштовні паки (CC0) |
| [craftpix.net](https://craftpix.net/freebies/) | Безкоштовні персонажі та тайли |
| [spriters-resource.com](https://www.spriters-resource.com) | Архів спрайтів з класичних ігор |

## Підготовка проекту

### Структура файлів

```
MyGame/
├── Assets/
│   ├── hero_spritesheet.png   ← спрайт-аркуш персонажа
│   └── tilemap.png            ← тайлова карта
├── MainWindow.xaml
└── MainWindow.xaml.cs
```

### Підключення зображень у проекті

У Visual Studio: правою кнопкою на проект → **Add → Existing Item** → вибрати `hero_spritesheet.png`. У властивостях файлу встановити:
- **Build Action**: `Resource`
- **Copy to Output Directory**: `Do not copy`

Тепер зображення вбудоване у збірку і доступне через URI `pack://application:,,,/Assets/hero_spritesheet.png`.

## Принцип роботи спрайтової анімації у WPF

WPF не має вбудованого класу для роботи зі спрайт-аркушами, але ми можемо реалізувати це через **`CroppedBitmap`** — клас, що «вирізає» прямокутну область із зображення.

```
hero_spritesheet.png (256×64 px)
┌────────┬────────┬────────┬────────┐
│        │        │        │        │
│ (0,0)  │(64,0)  │(128,0) │(192,0) │
│ 64×64  │ 64×64  │ 64×64  │ 64×64  │
└────────┴────────┴────────┴────────┘
  кадр 0   кадр 1   кадр 2   кадр 3
```

```csharp
// Завантажуємо весь аркуш
var sheet = new BitmapImage(new Uri("pack://application:,,,/Assets/hero.png"));

// Вирізаємо кадр 1 (x=64, y=0, ширина=64, висота=64)
var frame = new CroppedBitmap(sheet, new Int32Rect(64, 0, 64, 64));

// Відображаємо у Image
heroImage.Source = frame;
```

## Завантаження спрайт-аркуша вручну (без файлу)

Для демонстрації концепції можна генерувати спрайт-аркуш програмно через `WriteableBitmap`:

```csharp
// Простий аркуш: 4 кадри 32×32, кожен своїм кольором
private BitmapSource CreateDemoSpriteSheet()
{
    int frameW = 32, frameH = 32, cols = 4;
    var wb = new WriteableBitmap(frameW * cols, frameH,
                                  96, 96, PixelFormats.Bgra32, null);
    var colors = new[]
    {
        Color.FromRgb(255, 100, 100), // кадр 0
        Color.FromRgb(100, 255, 100), // кадр 1
        Color.FromRgb(100, 100, 255), // кадр 2
        Color.FromRgb(255, 255, 100), // кадр 3
    };

    for (int col = 0; col < cols; col++)
    {
        int stride = frameW * 4;
        var pixels = new byte[frameH * stride];
        for (int i = 0; i < pixels.Length; i += 4)
        {
            pixels[i]     = colors[col].B;
            pixels[i + 1] = colors[col].G;
            pixels[i + 2] = colors[col].R;
            pixels[i + 3] = 255;
        }
        wb.WritePixels(
            new Int32Rect(col * frameW, 0, frameW, frameH),
            pixels, stride, 0);
    }
    return wb;
}
```

---

У наступному розділі реалізуємо повноцінну анімацію ходьби персонажа.
