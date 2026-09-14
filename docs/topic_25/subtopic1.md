---
sidebar_position: 2
---

# DataGrid: стовпці, редагування, перевірка даних

## Таблиця, з якою можна працювати

У попередньому підрозділі `DataGrid` з'явився в кінці, майже мимохідь: чотири
рядки XAML — і дані вже редагуються. Насправді це найскладніший елемент
керування WPF, і саме тому він вартий окремої розмови. Реальна таблиця
в застосунку має:

- показувати різні типи даних по-різному (текст, галочка, дата, вибір зі списку);
- дозволяти редагувати одні стовпці й забороняти інші;
- не пускати в базу дурниці на кшталт від'ємної ціни;
- виділяти кольором проблемні рядки, щоб їх було видно здалеку.

Усе це `DataGrid` уміє. Розберімося по порядку.

## Модель рядка: товар на складі

Наскрізний приклад підрозділу — облік товарів невеликого магазину.

```csharp
using System;

namespace GridDemo;

public class Product : ViewModelBase
{
    private string _name = "";
    private string _category = "Бакалія";
    private decimal _price;
    private int _quantity;
    private bool _isAvailable = true;
    private DateTime _expiryDate = DateTime.Today.AddMonths(6);

    public string Name
    {
        get => _name;
        set => SetProperty(ref _name, value);
    }

    public string Category
    {
        get => _category;
        set => SetProperty(ref _category, value);
    }

    public decimal Price
    {
        get => _price;
        set
        {
            if (SetProperty(ref _price, value))
                OnPropertyChanged(nameof(Total));
        }
    }

    public int Quantity
    {
        get => _quantity;
        set
        {
            if (SetProperty(ref _quantity, value))
                OnPropertyChanged(nameof(Total));
        }
    }

    public bool IsAvailable
    {
        get => _isAvailable;
        set => SetProperty(ref _isAvailable, value);
    }

    public DateTime ExpiryDate
    {
        get => _expiryDate;
        set
        {
            if (SetProperty(ref _expiryDate, value))
                OnPropertyChanged(nameof(IsExpired));
        }
    }

    // Обчислювані властивості — тільки для читання.
    public decimal Total => Price * Quantity;

    public bool IsExpired => ExpiryDate < DateTime.Today;
}
```

:::tip Порада
Для грошей беріть `decimal`, а не `double`. `double` зберігає число
у двійковій системі, і `0.1 + 0.2` там дорівнює `0.30000000000000004`.
У бухгалтерії таке неприпустимо. `decimal` рахує в десятковій системі
й для грошових сум дає точний результат.
:::

## AutoGenerateColumns: зручно рівно один раз

За замовчуванням `DataGrid` має `AutoGenerateColumns="True"` і будує стовпці сам:
дивиться на тип елемента колекції через **рефлексію** й робить по стовпцю
на кожну публічну властивість.

```xml
<DataGrid ItemsSource="{Binding Products}" />
```

Результат:

```
┌──────────┬───────────┬───────┬──────────┬─────────────┬────────────┬───────┬───────────┐
│ Name     │ Category  │ Price │ Quantity │ IsAvailable │ ExpiryDate │ Total │ IsExpired │
├──────────┼───────────┼───────┼──────────┼─────────────┼────────────┼───────┼───────────┤
│ Кава     │ Напої     │ 189   │ 12       │     ☑       │ 01.03.2026 │ 2268  │     ☐     │
└──────────┴───────────┴───────┴──────────┴─────────────┴────────────┴───────┴───────────┘
```

Працює — і водночас нікуди не годиться:

- **заголовки англійською**, бо це імена властивостей у коді;
- **показано зайве**: `IsExpired` користувачеві бачити не треба;
- **порядок стовпців** — порядок оголошення в класі, а не логіка задачі;
- **формат сирий**: `189` замість `189,00 грн`, `01.03.2026 0:00:00` для дати;
- **усе редаговане**, навіть те, що не має бути;
- **найгірше**: варто комусь перейменувати властивість чи додати нову — і вигляд
  таблиці мовчки змінився. Ніякої помилки компіляції не буде.

Тому в робочому застосунку майже завжди пишуть `AutoGenerateColumns="False"`
і задають стовпці вручну. Автогенерація лишається тим, чим є: способом
за п'ять секунд подивитися, які дані взагалі приїхали.

:::info Цікаво
Приховати окрему властивість від автогенерації можна атрибутом
`[Browsable(false)]` з простору імен `System.ComponentModel`,
а перейменувати заголовок — атрибутом `[DisplayName("Ціна")]`.
Але це означає, що модель даних починає знати про свій вигляд на екрані,
а це порушує розділення рівнів у MVVM. Краще просто описати стовпці в XAML.
:::

## П'ять типів стовпців

| Тип стовпця | Що показує | Коли потрібен |
| --- | --- | --- |
| `DataGridTextColumn` | текст, редагується в `TextBox` | 80% випадків: назви, числа, суми |
| `DataGridCheckBoxColumn` | галочка | властивості типу `bool` |
| `DataGridComboBoxColumn` | випадний список | вибір з фіксованого набору |
| `DataGridHyperlinkColumn` | клікабельне посилання | e-mail, сайт, шлях до файлу |
| `DataGridTemplateColumn` | що завгодно | дати, кнопки, зображення, індикатори |

### DataGridTextColumn

```xml
<DataGridTextColumn Header="Назва товару"
                    Binding="{Binding Name}"
                    Width="*" />

<DataGridTextColumn Header="Ціна"
                    Binding="{Binding Price, StringFormat='{}{0:N2} грн'}"
                    Width="100" />
```

`StringFormat` форматує значення так само, як інтерполяція рядків. Дивна
конструкція `'{}{0:N2}'` на початку — не помилка: перші дві фігурні дужки
кажуть аналізатору XAML «далі йде звичайний рядок, а не розширення розмітки».
Без них XAML спробує прочитати фігурну дужку як початок `Binding` і впаде.

| Формат | Приклад результату |
| --- | --- |
| `N2` | `1 234,50` |
| `C` | `1 234,50 ₴` (залежить від культури системи) |
| `F1` | `1234,5` |
| `P0` | `85%` |
| `dd.MM.yyyy` | `01.03.2026` |

### DataGridCheckBoxColumn

```xml
<DataGridCheckBoxColumn Header="Є в наявності"
                        Binding="{Binding IsAvailable}"
                        Width="110" />
```

Для `bool` це найкоротший шлях. Зверніть увагу: щоб поставити галочку,
за замовчуванням треба клікнути двічі — перший клік входить у режим
редагування комірки, другий перемикає стан. Це дратує користувачів, і нижче
ми виправимо це шаблонним стовпцем.

### DataGridComboBoxColumn

Потрібен, коли значення має бути одним з набору — категорія, статус, група.

```xml
<DataGridComboBoxColumn Header="Категорія"
                        SelectedItemBinding="{Binding Category}"
                        Width="130">
    <DataGridComboBoxColumn.ItemsSource>
        <x:Array Type="sys:String"
                 xmlns:sys="clr-namespace:System;assembly=System.Runtime">
            <sys:String>Бакалія</sys:String>
            <sys:String>Напої</sys:String>
            <sys:String>Молочне</sys:String>
            <sys:String>Випічка</sys:String>
        </x:Array>
    </DataGridComboBoxColumn.ItemsSource>
</DataGridComboBoxColumn>
```

:::warning Обережно
`DataGridComboBoxColumn` — не звичайний елемент у візуальному дереві, він
живе окремо і **не успадковує `DataContext`** вікна. Тому прив'язка
`ItemsSource="{Binding Categories}"` на ньому просто не спрацює: у вікні
виводу Visual Studio ви побачите `BindingExpression path error`.
Виходи: задати список статично, як вище, або прив'язатися через
`Source={x:Static ...}`, або — найпростіше — узагалі взяти
`DataGridTemplateColumn` зі звичайним `ComboBox` усередині.
:::

Надійніший варіант того самого стовпця, коли список категорій живе
в моделі подання:

```xml
<DataGridTemplateColumn Header="Категорія" Width="130">
    <DataGridTemplateColumn.CellTemplate>
        <DataTemplate>
            <TextBlock Text="{Binding Category}" VerticalAlignment="Center" />
        </DataTemplate>
    </DataGridTemplateColumn.CellTemplate>
    <DataGridTemplateColumn.CellEditingTemplate>
        <DataTemplate>
            <ComboBox SelectedItem="{Binding Category}"
                      ItemsSource="{Binding DataContext.Categories,
                                    RelativeSource={RelativeSource
                                        AncestorType=DataGrid}}" />
        </DataTemplate>
    </DataGridTemplateColumn.CellEditingTemplate>
</DataGridTemplateColumn>
```

Тут `RelativeSource AncestorType=DataGrid` каже: «піднімись деревом угору
до `DataGrid` і візьми його `DataContext`» — тобто модель подання.

### DataGridHyperlinkColumn

```xml
<DataGridHyperlinkColumn Header="Сайт постачальника"
                         Binding="{Binding SupplierUrl}"
                         Width="180" />
```

Стовпець сам робить із тексту посилання. Але клік по ньому нічого не відкриває,
поки ви не обробите подію `Hyperlink.RequestNavigate` — WPF навмисно не запускає
браузер без вашої згоди.

### DataGridTemplateColumn

Найгнучкіший: ви самі описуєте, що всередині комірки. У нього два шаблони —
`CellTemplate` (звичайний вигляд) і `CellEditingTemplate` (вигляд у режимі
редагування).

Дата з календариком:

```xml
<DataGridTemplateColumn Header="Придатний до" Width="130">
    <DataGridTemplateColumn.CellTemplate>
        <DataTemplate>
            <TextBlock Text="{Binding ExpiryDate, StringFormat='{}{0:dd.MM.yyyy}'}"
                       VerticalAlignment="Center" Margin="4,0" />
        </DataTemplate>
    </DataGridTemplateColumn.CellTemplate>
    <DataGridTemplateColumn.CellEditingTemplate>
        <DataTemplate>
            <DatePicker SelectedDate="{Binding ExpiryDate}" />
        </DataTemplate>
    </DataGridTemplateColumn.CellEditingTemplate>
</DataGridTemplateColumn>
```

Галочка «в один клік» (без `CellEditingTemplate` — вона просто завжди активна):

```xml
<DataGridTemplateColumn Header="Наявність" Width="90">
    <DataGridTemplateColumn.CellTemplate>
        <DataTemplate>
            <CheckBox IsChecked="{Binding IsAvailable, UpdateSourceTrigger=PropertyChanged}"
                      HorizontalAlignment="Center" VerticalAlignment="Center" />
        </DataTemplate>
    </DataGridTemplateColumn.CellTemplate>
</DataGridTemplateColumn>
```

Кнопка «Видалити» просто в рядку:

```xml
<DataGridTemplateColumn Header="" Width="36">
    <DataGridTemplateColumn.CellTemplate>
        <DataTemplate>
            <Button Content="✕" ToolTip="Видалити товар"
                    Width="24" Height="20" Padding="0"
                    Command="{Binding DataContext.DeleteCommand,
                              RelativeSource={RelativeSource AncestorType=DataGrid}}"
                    CommandParameter="{Binding}" />
        </DataTemplate>
    </DataGridTemplateColumn.CellTemplate>
</DataGridTemplateColumn>
```

Зверніть увагу на пару: команда береться з моделі подання (через
`RelativeSource`), а `CommandParameter="{Binding}"` передає в неї **сам рядок**,
бо `DataContext` комірки — це об'єкт `Product`. Це стандартний прийом
«кнопка в рядку таблиці» у MVVM.

## Налаштування стовпців

### Ширина

| Значення `Width` | Що означає |
| --- | --- |
| `100` | рівно 100 незалежних від пристрою одиниць |
| `Auto` | по найширшому вмісту (враховує **всі** рядки, навіть невидимі) |
| `SizeToCells` | по вмісту комірок, заголовок не враховується |
| `SizeToHeader` | по заголовку, вміст не враховується |
| `*` | забрати весь вільний простір |
| `2*` | удвічі більше, ніж сусідній `*` |

:::warning Обережно
`Width="Auto"` на таблиці з десятками тисяч рядків вимикає переваги
віртуалізації по горизонталі: щоб порахувати ширину, `DataGrid` мусить
виміряти вміст усіх рядків. На великих обсягах ставте конкретні числа
або зірочки.
:::

### Заголовки, лише для читання, сортування

```xml
<DataGridTextColumn Header="Сума"
                    Binding="{Binding Total, StringFormat='{}{0:N2} грн'}"
                    IsReadOnly="True"
                    SortMemberPath="Total"
                    CanUserSort="True"
                    Width="120" />
```

- `IsReadOnly="True"` — стовпець не редагується. Для обчислюваних властивостей
  без сетера це обов'язково, інакше при спробі редагування отримаєте виняток.
- Сортування кліком по заголовку працює **з коробки**, нічого писати не треба.
  `SortMemberPath` знадобиться лише тоді, коли сортувати треба не за тим,
  що показано (наприклад, показуємо назву місяця, а сортуємо за номером).
- `CanUserSort="False"` вимикає сортування конкретного стовпця.
- Вимкнути сортування в усій таблиці: `CanUserSortColumns="False"` на `DataGrid`.

### Заморожені стовпці

Коли стовпців багато й таблиця прокручується вбік, зручно «прибити» перші
стовпці до лівого краю — як закріплені області в Excel:

```xml
<DataGrid ItemsSource="{Binding Products}"
          AutoGenerateColumns="False"
          FrozenColumnCount="1">
```

Тепер перший стовпець (назва товару) завжди видно, скільки б ви не гортали
вправо.

```
◀── прокручування ──▶
┌───────────┬┄┄┄┄┄┄┄┄┬┄┄┄┄┄┄┄┄┬┄┄┄┄┄┄┄┄┄┐
│ Назва     ┆ Ціна   ┆ К-сть  ┆ Сума    ┆  ← ці стовпці їдуть
│ (заморож.)┆        ┆        ┆         ┆
├───────────┼┄┄┄┄┄┄┄┄┼┄┄┄┄┄┄┄┄┼┄┄┄┄┄┄┄┄┄┤
│ Кава      ┆ 189,00 ┆ 12     ┆ 2268,00 ┆
│ Молоко    ┆  38,50 ┆ 40     ┆ 1540,00 ┆
└───────────┴┄┄┄┄┄┄┄┄┴┄┄┄┄┄┄┄┄┴┄┄┄┄┄┄┄┄┄┘
 ↑ стоїть на місці
```

## Редагування прямо в таблиці

### Що дозволити користувачеві

| Властивість `DataGrid` | Значення | Ефект |
| --- | --- | --- |
| `IsReadOnly` | `True` | уся таблиця лише для перегляду |
| `CanUserAddRows` | `True` | внизу з'являється порожній рядок із зірочкою |
| `CanUserDeleteRows` | `True` | клавіша Delete видаляє виділений рядок |
| `CanUserReorderColumns` | `False` | заборонити перетягувати стовпці мишею |
| `CanUserResizeRows` | `False` | заборонити міняти висоту рядків |
| `SelectionUnit` | `FullRow` / `Cell` / `CellOrRowHeader` | що саме виділяється кліком |
| `SelectionMode` | `Single` / `Extended` | один рядок чи кілька |

:::danger Часта помилка
`CanUserAddRows="True"` мовчки не працює, якщо в класу елемента немає
**публічного конструктора без параметрів** — `DataGrid` просто не показує
рядок-заповнювач. Так само він не працює, якщо `ItemsSource` прив'язано
до колекції, яка не підтримує додавання (наприклад, до масиву або до
`IEnumerable`, а не до `ObservableCollection`).
:::

### SelectionUnit: рядок чи комірка

```
SelectionUnit="FullRow"              SelectionUnit="Cell"
┌───────┬───────┬───────┐            ┌───────┬───────┬───────┐
│▓▓▓▓▓▓▓│▓▓▓▓▓▓▓│▓▓▓▓▓▓▓│            │       │▓▓▓▓▓▓▓│       │
├───────┼───────┼───────┤            ├───────┼───────┼───────┤
│       │       │       │            │       │       │       │
└───────┴───────┴───────┘            └───────┴───────┴───────┘
 виділяється весь рядок               виділяється одна комірка
 SelectedItem = об'єкт                SelectedCells = список комірок
```

Для MVVM зручніший `FullRow`: тоді працює звичний `SelectedItem`.
`Cell` беруть, коли треба копіювати окремі значення в буфер обміну.

### Події редагування: остання лінія оборони

`DataGrid` дає три події, що охоплюють увесь цикл правки комірки:

```
користувач двічі клацнув по комірці
            │
            ▼
   ┌─────────────────┐
   │ BeginningEdit   │  ◀── тут можна НЕ ПУСТИТИ в редагування: e.Cancel = true
   └────────┬────────┘
            │  комірка перетворилась на TextBox, користувач друкує
            ▼
   ┌─────────────────┐
   │ CellEditEnding  │  ◀── тут перевіряють ЗНАЧЕННЯ КОМІРКИ
   └────────┬────────┘      e.Cancel = true поверне старе значення
            │
            │  (користувач перейшов на інший рядок або натиснув Enter)
            ▼
   ┌─────────────────┐
   │ RowEditEnding   │  ◀── тут перевіряють ВЕСЬ РЯДОК цілком
   └─────────────────┘      e.Cancel = true не випустить з рядка
```

Різниця між двома останніми принципова. `CellEditEnding` бачить лише одну
комірку, тож правило «ціна не може бути від'ємною» перевіряється тут.
А правило «сума знижки не може перевищувати ціну» стосується двох полів
одразу — його місце в `RowEditEnding`, коли рядок уже заповнений.

```csharp
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;

namespace GridDemo;

public partial class ProductsWindow : Window
{
    public ProductsWindow()
    {
        InitializeComponent();
    }

    // Не даємо редагувати рядки прострочених товарів.
    private void ProductsGrid_BeginningEdit(object sender, DataGridBeginningEditEventArgs e)
    {
        if (e.Row.Item is Product product && product.IsExpired)
        {
            e.Cancel = true;
            MessageBox.Show("Прострочений товар редагувати не можна.",
                            "Заборонено", MessageBoxButton.OK, MessageBoxImage.Information);
        }
    }

    // Перевіряємо щойно введене значення в комірці "Ціна".
    private void ProductsGrid_CellEditEnding(object sender, DataGridCellEditEndingEventArgs e)
    {
        if ((e.Column.Header as string) != "Ціна")
            return;

        if (e.EditingElement is TextBox box &&
            (!decimal.TryParse(box.Text, out var price) || price < 0))
        {
            e.Cancel = true;                    // скасовуємо — старе значення лишається
            box.Background = Brushes.MistyRose;
        }
    }

    // Перевіряємо рядок цілком.
    private void ProductsGrid_RowEditEnding(object sender, DataGridRowEditEndingEventArgs e)
    {
        if (e.Row.Item is Product product && string.IsNullOrWhiteSpace(product.Name))
        {
            e.Cancel = true;
            MessageBox.Show("Назва товару не може бути порожньою.", "Помилка",
                            MessageBoxButton.OK, MessageBoxImage.Warning);
        }
    }
}
```

:::note
Ці обробники живуть у code-behind — і це нормально навіть у MVVM. Вони
працюють з елементами інтерфейсу (`DataGridCell`, `TextBox`), тобто
розв'язують задачу **подання**, а не моделі. Головне — не писати тут
бізнес-логіку на кшталт перерахунку підсумків; її місце в моделі подання.
:::

## Перевірка даних через IDataErrorInfo

Події — інструмент грубий: вони спрацьовують у момент виходу з комірки
і потребують коду в кожному вікні. Набагато чистіше описати правила
**один раз у моделі рядка**, через знайомий вам з теми 24 інтерфейс
`IDataErrorInfo`.

```csharp
using System;
using System.ComponentModel;

namespace GridDemo;

public class Product : ViewModelBase, IDataErrorInfo
{
    // ... властивості з початку підрозділу ...

    // Індексатор: помилка конкретної властивості.
    public string this[string columnName] => columnName switch
    {
        nameof(Name) when string.IsNullOrWhiteSpace(Name)
            => "Назва не може бути порожньою",

        nameof(Name) when Name.Length > 60
            => "Назва задовга (максимум 60 символів)",

        nameof(Price) when Price < 0
            => "Ціна не може бути від'ємною",

        nameof(Price) when Price > 100000
            => "Ціна виглядає підозріло великою",

        nameof(Quantity) when Quantity < 0
            => "Кількість не може бути від'ємною",

        nameof(ExpiryDate) when ExpiryDate < new DateTime(2000, 1, 1)
            => "Некоректна дата",

        _ => string.Empty
    };

    // Помилка об'єкта загалом — саме її показує DataGrid у заголовку рядка.
    public string Error
    {
        get
        {
            // Перевіряємо всі властивості по черзі, без LINQ.
            string[] properties = [nameof(Name), nameof(Price),
                                   nameof(Quantity), nameof(ExpiryDate)];

            foreach (var property in properties)
            {
                var message = this[property];
                if (!string.IsNullOrEmpty(message))
                    return message;
            }

            return string.Empty;
        }
    }
}
```

Щоб `DataGrid` почав це читати, у стовпці треба увімкнути перевірку:

```xml
<DataGridTextColumn Header="Ціна"
                    Width="100"
                    Binding="{Binding Price,
                              ValidatesOnDataErrors=True,
                              UpdateSourceTrigger=PropertyChanged,
                              StringFormat='{}{0:N2}'}" />
```

- `ValidatesOnDataErrors=True` — «питай `IDataErrorInfo` після кожного запису».
- `UpdateSourceTrigger=PropertyChanged` — перевіряти під час набору,
  а не після виходу з комірки. Для валідації це зазвичай зручніше.

Помилкова комірка одразу обводиться червоним — цей вигляд `DataGrid` дає
без вашої участі.

### Підсвічування помилкового рядка

Помилка комірки видна лише тоді, коли на неї дивишся. Щоб проблемний рядок
кидався в очі, у `DataGrid` є `RowValidationErrorTemplate` — шаблон значка
в лівому заголовку рядка:

```xml
<DataGrid.RowValidationErrorTemplate>
    <ControlTemplate>
        <Grid Margin="0,-2,0,-2" ToolTip="{Binding RelativeSource={RelativeSource
                  AncestorType=DataGridRow}, Path=(Validation.Errors)[0].ErrorContent}">
            <Ellipse StrokeThickness="0" Fill="#D32F2F"
                     Width="14" Height="14" />
            <TextBlock Text="!" FontSize="11" FontWeight="Bold"
                       Foreground="White"
                       HorizontalAlignment="Center"
                       VerticalAlignment="Center" />
        </Grid>
    </ControlTemplate>
</DataGrid.RowValidationErrorTemplate>
```

Тепер зліва від битого рядка з'являється червоний кружечок з окликом,
а якщо навести мишу — спливає текст помилки з `Error`.

```
   ┌───┬─────────────┬─────────┬────────┐
   │   │ Назва       │ Ціна    │ К-сть  │
   ├───┼─────────────┼─────────┼────────┤
   │   │ Кава        │  189,00 │   12   │
   │ ! │ Молоко      │  -38,50 │   40   │  ← червоний значок у заголовку рядка
   │   │ Цукор       │   32,00 │    8   │
   └───┴─────────────┴─────────┴────────┘
       ▲
       RowValidationErrorTemplate
```

:::warning Обережно
Валідація рядка через `IDataErrorInfo.Error` спрацьовує тільки тоді, коли
`DataGrid` бачить у джерелі рядок як `IEditableObject` або коли ви
прив'язали хоча б один стовпець із `ValidatesOnDataErrors=True`.
Якщо значок не з'являється — перевірте цей атрибут у стовпцях.
:::

## Оформлення рядків

### Чергування кольору

```xml
<DataGrid AlternatingRowBackground="#F5F7FA"
          AlternationCount="2"
          RowHeight="26" />
```

Класичний «зебра-ефект»: око не збивається на сусідній рядок. `AlternationCount`
каже, через скільки рядків повторювати візерунок; для двох кольорів це `2`.

### RowStyle з DataTrigger: червоний рядок для прострочених

```xml
<DataGrid.RowStyle>
    <Style TargetType="DataGridRow">
        <Style.Triggers>
            <!-- Прострочені товари -->
            <DataTrigger Binding="{Binding IsExpired}" Value="True">
                <Setter Property="Background" Value="#FFEBEE" />
                <Setter Property="Foreground" Value="#B71C1C" />
                <Setter Property="ToolTip" Value="Термін придатності минув" />
            </DataTrigger>

            <!-- Товар закінчився -->
            <DataTrigger Binding="{Binding Quantity}" Value="0">
                <Setter Property="FontStyle" Value="Italic" />
                <Setter Property="Opacity" Value="0.6" />
            </DataTrigger>
        </Style.Triggers>
    </Style>
</DataGrid.RowStyle>
```

`DataTrigger` дивиться не на властивість елемента керування (як звичайний
`Trigger` з теми 22), а на **дані**, до яких прив'язаний рядок. Тобто
правило «якщо `IsExpired` дорівнює `True` — фарбуй у рожеве» описується
повністю декларативно, без жодного рядка C#.

:::danger Часта помилка
`AlternatingRowBackground` і `Background` із `DataTrigger` конфліктують:
локальне значення чергування має вищий пріоритет, ніж сетер у стилі,
і ваш червоний рядок може не з'явитися. Якщо так сталося — приберіть
`AlternatingRowBackground` і задайте чергування теж тригером,
через `AlternationIndex`.
:::

## Повний робочий приклад

Модель подання:

```csharp
using System;
using System.Collections.ObjectModel;
using System.Windows.Input;

namespace GridDemo;

public class WarehouseViewModel : ViewModelBase
{
    private Product? _selectedProduct;

    public ObservableCollection<Product> Products { get; } =
    [
        new Product { Name = "Кава зернова",  Category = "Напої",   Price = 189m, Quantity = 12,
                      ExpiryDate = new DateTime(2026, 11, 30) },
        new Product { Name = "Молоко 2,5%",   Category = "Молочне", Price = 38.5m, Quantity = 40,
                      ExpiryDate = new DateTime(2026, 9, 10) },
        new Product { Name = "Цукор",         Category = "Бакалія", Price = 32m,  Quantity = 0,
                      ExpiryDate = new DateTime(2027, 5, 1) },
        new Product { Name = "Круасан",       Category = "Випічка", Price = 28m,  Quantity = 6,
                      ExpiryDate = new DateTime(2026, 9, 15) }
    ];

    public ObservableCollection<string> Categories { get; } =
        ["Бакалія", "Напої", "Молочне", "Випічка"];

    public Product? SelectedProduct
    {
        get => _selectedProduct;
        set => SetProperty(ref _selectedProduct, value);
    }

    public ICommand AddCommand { get; }
    public ICommand DeleteCommand { get; }

    public WarehouseViewModel()
    {
        AddCommand = new RelayCommand(_ =>
        {
            var product = new Product { Name = "Новий товар" };
            Products.Add(product);
            SelectedProduct = product;
        });

        DeleteCommand = new RelayCommand(
            parameter =>
            {
                if (parameter is Product product)
                    Products.Remove(product);
            },
            parameter => parameter is Product);
    }
}
```

Вікно:

```xml
<Window x:Class="GridDemo.ProductsWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        xmlns:local="clr-namespace:GridDemo"
        Title="Склад магазину" Height="420" Width="800">
    <Window.DataContext>
        <local:WarehouseViewModel />
    </Window.DataContext>

    <DockPanel Margin="12">
        <ToolBar DockPanel.Dock="Top">
            <Button Content="Додати товар" Command="{Binding AddCommand}" Padding="8,2" />
            <Separator />
            <Button Content="Видалити"
                    Command="{Binding DeleteCommand}"
                    CommandParameter="{Binding SelectedProduct}"
                    Padding="8,2" />
        </ToolBar>

        <StatusBar DockPanel.Dock="Bottom">
            <TextBlock Text="{Binding Products.Count, StringFormat='Позицій: {0}'}" />
        </StatusBar>

        <DataGrid x:Name="ProductsGrid"
                  ItemsSource="{Binding Products}"
                  SelectedItem="{Binding SelectedProduct}"
                  AutoGenerateColumns="False"
                  CanUserAddRows="False"
                  CanUserDeleteRows="True"
                  SelectionUnit="FullRow"
                  SelectionMode="Single"
                  AlternationCount="2"
                  FrozenColumnCount="1"
                  RowHeaderWidth="22"
                  BeginningEdit="ProductsGrid_BeginningEdit"
                  CellEditEnding="ProductsGrid_CellEditEnding"
                  RowEditEnding="ProductsGrid_RowEditEnding">

            <DataGrid.RowValidationErrorTemplate>
                <ControlTemplate>
                    <Grid ToolTip="{Binding RelativeSource={RelativeSource
                              AncestorType=DataGridRow}, Path=(Validation.Errors)[0].ErrorContent}">
                        <Ellipse Fill="#D32F2F" Width="14" Height="14" />
                        <TextBlock Text="!" Foreground="White" FontWeight="Bold" FontSize="11"
                                   HorizontalAlignment="Center" VerticalAlignment="Center" />
                    </Grid>
                </ControlTemplate>
            </DataGrid.RowValidationErrorTemplate>

            <DataGrid.RowStyle>
                <Style TargetType="DataGridRow">
                    <Style.Triggers>
                        <DataTrigger Binding="{Binding IsExpired}" Value="True">
                            <Setter Property="Background" Value="#FFEBEE" />
                            <Setter Property="Foreground" Value="#B71C1C" />
                            <Setter Property="ToolTip" Value="Термін придатності минув" />
                        </DataTrigger>
                        <DataTrigger Binding="{Binding Quantity}" Value="0">
                            <Setter Property="FontStyle" Value="Italic" />
                            <Setter Property="Opacity" Value="0.6" />
                        </DataTrigger>
                    </Style.Triggers>
                </Style>
            </DataGrid.RowStyle>

            <DataGrid.Columns>
                <DataGridTextColumn Header="Назва товару" Width="*"
                                    Binding="{Binding Name,
                                              ValidatesOnDataErrors=True,
                                              UpdateSourceTrigger=PropertyChanged}" />

                <DataGridTemplateColumn Header="Категорія" Width="120">
                    <DataGridTemplateColumn.CellTemplate>
                        <DataTemplate>
                            <TextBlock Text="{Binding Category}" Margin="4,0"
                                       VerticalAlignment="Center" />
                        </DataTemplate>
                    </DataGridTemplateColumn.CellTemplate>
                    <DataGridTemplateColumn.CellEditingTemplate>
                        <DataTemplate>
                            <ComboBox SelectedItem="{Binding Category}"
                                      ItemsSource="{Binding DataContext.Categories,
                                          RelativeSource={RelativeSource AncestorType=DataGrid}}" />
                        </DataTemplate>
                    </DataGridTemplateColumn.CellEditingTemplate>
                </DataGridTemplateColumn>

                <DataGridTextColumn Header="Ціна" Width="100"
                                    Binding="{Binding Price,
                                              ValidatesOnDataErrors=True,
                                              UpdateSourceTrigger=PropertyChanged,
                                              StringFormat='{}{0:N2}'}" />

                <DataGridTextColumn Header="К-сть" Width="70"
                                    Binding="{Binding Quantity,
                                              ValidatesOnDataErrors=True,
                                              UpdateSourceTrigger=PropertyChanged}" />

                <DataGridTextColumn Header="Сума" Width="110" IsReadOnly="True"
                                    Binding="{Binding Total, StringFormat='{}{0:N2} грн'}" />

                <DataGridTemplateColumn Header="Придатний до" Width="120">
                    <DataGridTemplateColumn.CellTemplate>
                        <DataTemplate>
                            <TextBlock Text="{Binding ExpiryDate, StringFormat='{}{0:dd.MM.yyyy}'}"
                                       Margin="4,0" VerticalAlignment="Center" />
                        </DataTemplate>
                    </DataGridTemplateColumn.CellTemplate>
                    <DataGridTemplateColumn.CellEditingTemplate>
                        <DataTemplate>
                            <DatePicker SelectedDate="{Binding ExpiryDate}" />
                        </DataTemplate>
                    </DataGridTemplateColumn.CellEditingTemplate>
                </DataGridTemplateColumn>

                <DataGridTemplateColumn Header="Наявність" Width="80">
                    <DataGridTemplateColumn.CellTemplate>
                        <DataTemplate>
                            <CheckBox IsChecked="{Binding IsAvailable,
                                                  UpdateSourceTrigger=PropertyChanged}"
                                      HorizontalAlignment="Center" VerticalAlignment="Center" />
                        </DataTemplate>
                    </DataGridTemplateColumn.CellTemplate>
                </DataGridTemplateColumn>
            </DataGrid.Columns>
        </DataGrid>
    </DockPanel>
</Window>
```

Вигляд вікна:

```
┌─ Склад магазину ──────────────────────────────────────────────────── ─ □ ✕ ┐
│ [ Додати товар ] │ [ Видалити ]                                            │
├───┬──────────────┬───────────┬────────┬───────┬──────────┬────────────┬────┤
│   │ Назва товару │ Категорія │  Ціна  │ К-сть │   Сума   │Придатний до│ ✓  │
├───┼──────────────┼───────────┼────────┼───────┼──────────┼────────────┼────┤
│   │ Кава зернова │ Напої     │ 189,00 │  12   │ 2268,00₴ │ 30.11.2026 │ ☑  │
│   │ Молоко 2,5%  │ Молочне   │  38,50 │  40   │ 1540,00₴ │ 10.09.2026 │ ☑  │
│   │ Цукор        │ Бакалія   │  32,00 │   0   │    0,00₴ │ 01.05.2027 │ ☐  │
│ ! │ Круасан      │ Випічка   │  -28,0 │   6   │ -168,00₴ │ 15.09.2026 │ ☑  │
├───┴──────────────┴───────────┴────────┴───────┴──────────┴────────────┴────┤
│ Позицій: 4                                                                 │
└────────────────────────────────────────────────────────────────────────────┘
```

## Типові помилки

1. **`AutoGenerateColumns="True"` у робочому застосунку.** Заголовки
   англійською, службові властивості на видноті, вигляд ламається від
   перейменування поля в моделі. Правильно: вимкнути автогенерацію
   й описати стовпці явно.

2. **Редагований стовпець для обчислюваної властивості.** Прив'язка
   до `Total`, у якої немає сетера, при спробі правки дає виняток або
   мовчазне ігнорування. Правильно: `IsReadOnly="True"`.

3. **`{Binding Categories}` у `DataGridComboBoxColumn`.** Стовпець не в
   візуальному дереві й не бачить `DataContext` вікна — список буде порожній.
   Правильно: `DataGridTemplateColumn` із `ComboBox` і `RelativeSource`.

4. **Валідація лише в події `CellEditEnding`.** Правила розповзаються
   по code-behind кожного вікна й не працюють, коли дані змінюються з коду.
   Правильно: `IDataErrorInfo` на моделі рядка плюс
   `ValidatesOnDataErrors=True` у стовпцях.

5. **`CanUserAddRows="True"` без конструктора без параметрів.** Рядок-зірочка
   просто не з'являється, і студент шукає помилку в XAML. Правильно:
   або додати такий конструктор, або зробити власну кнопку «Додати»
   з командою в моделі подання — це чистіший шлях для MVVM.
