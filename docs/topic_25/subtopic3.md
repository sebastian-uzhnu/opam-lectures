---
sidebar_position: 4
---

# Підсумки, звіти та експорт у файл

## Таблиця — це ще не звіт

Уявіть касира кав'ярні наприкінці зміни. У нього на екрані таблиця на сто
рядків: що продали, коли, за скільки. Він дивиться на неї і... нічого не бачить.
Бо йому треба знати три числа: скільки замовлень, на яку суму і який середній
чек. Ще краще — розбивку за категоріями: скільки заробили на каві, скільки
на десертах.

Саме це відрізняє **таблицю** від **звіту**. Таблиця показує дані. Звіт
показує висновки: підсумки, середні, кількості за групами. І найкраще,
коли звіт живе прямо під таблицею й перераховується сам — змінили кількість
у рядку, і сума внизу одразу інша.

У цьому підрозділі ми доробимо застосунок до кінця: підсумки, звіт
за категоріями, експорт у файл і друк.

## Модель: замовлення кав'ярні

```csharp
using System;

namespace CafeReports;

public class Order : ViewModelBase
{
    private int _number;
    private DateTime _time = DateTime.Now;
    private string _productName = "";
    private string _category = "Кава";
    private int _quantity = 1;
    private decimal _unitPrice;
    private bool _isPaid;

    public int Number
    {
        get => _number;
        set => SetProperty(ref _number, value);
    }

    public DateTime Time
    {
        get => _time;
        set => SetProperty(ref _time, value);
    }

    public string ProductName
    {
        get => _productName;
        set => SetProperty(ref _productName, value);
    }

    public string Category
    {
        get => _category;
        set => SetProperty(ref _category, value);
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

    public decimal UnitPrice
    {
        get => _unitPrice;
        set
        {
            if (SetProperty(ref _unitPrice, value))
                OnPropertyChanged(nameof(Total));
        }
    }

    public bool IsPaid
    {
        get => _isPaid;
        set => SetProperty(ref _isPaid, value);
    }

    public decimal Total => Quantity * UnitPrice;
}
```

## Підсумки як обчислювані властивості

Перша думка початківця — порахувати суму один раз у конструкторі й покласти
в поле. Це не працює: числа застигнуть на місці. Підсумок має бути
**властивістю моделі подання**, яка перераховується щоразу, коли для цього
є привід.

```csharp
private decimal _totalSum;
private decimal _averageCheck;
private int _visibleCount;
private int _itemsCount;

public decimal TotalSum
{
    get => _totalSum;
    private set => SetProperty(ref _totalSum, value);
}

public decimal AverageCheck
{
    get => _averageCheck;
    private set => SetProperty(ref _averageCheck, value);
}

public int VisibleCount
{
    get => _visibleCount;
    private set => SetProperty(ref _visibleCount, value);
}

public int ItemsCount
{
    get => _itemsCount;
    private set => SetProperty(ref _itemsCount, value);
}
```

Сетери зроблені `private` — підсумки ніхто не «встановлює» ззовні, їх лише
рахують усередині моделі подання.

Сам перерахунок — звичайний цикл. LINQ ми ще не знаємо, та він тут і не
потрібен:

```csharp
private void RecalculateTotals()
{
    decimal sum = 0;
    var orders = 0;
    var items = 0;

    // Проходимо по ПОДАННЮ, а не по колекції:
    // підсумки мають стосуватися того, що людина бачить на екрані.
    foreach (var element in OrdersView)
    {
        if (element is not Order order)
            continue;

        sum += order.Total;
        items += order.Quantity;
        orders++;
    }

    TotalSum = sum;
    ItemsCount = items;
    VisibleCount = orders;
    AverageCheck = orders == 0 ? 0 : sum / orders;

    BuildCategoryReport();
}
```

:::tip[Порада]
Рахуйте підсумки по `ICollectionView`, а не по `ObservableCollection`.
Тоді ввімкнений фільтр автоматично впливає на числа: обрали категорію
«Десерти» — і внизу сума саме по десертах. Якщо рахувати по колекції,
фільтр і підсумки житимуть окремими життями, і користувач цього не зрозуміє.
:::

## Тонке місце: коли саме перераховувати

Ось де студенти найчастіше спотикаються. Підсумок залежить від двох різних
речей, і кожна сповіщає про зміни **своєю** подією.

```
                        Що може змінити підсумок?
                                  │
            ┌─────────────────────┴─────────────────────┐
            ▼                                           ▼
  1. СКЛАД КОЛЕКЦІЇ                          2. ПОЛЕ ВСЕРЕДИНІ ЕЛЕМЕНТА
     додали / видалили замовлення               змінили Quantity або UnitPrice
            │                                           │
            ▼                                           ▼
  ObservableCollection кидає                  сам Order кидає
  подію CollectionChanged                     подію PropertyChanged
  (INotifyCollectionChanged)                  (INotifyPropertyChanged)
            │                                           │
            └─────────────────┬─────────────────────────┘
                              ▼
                     RecalculateTotals()
```

Підписатися лише на `CollectionChanged` — типова половинчаста робота: додавання
рядка суму оновить, а редагування кількості в уже наявному рядку — ні. Модель
подання **мусить слухати обидві події**.

Але тут ховається друга пастка. Колекція змінюється, елементи приходять і
йдуть, і на кожен новий елемент треба підписатися, а з кожного видаленого —
відписатися. Інакше:

- новий елемент не впливатиме на підсумки (на нього ніхто не підписаний);
- видалений елемент так і триматиме посилання на модель подання і не
  звільниться складальником сміття — це **витік пам'яті**.

Повний, правильний код:

```csharp
using System.Collections.ObjectModel;
using System.Collections.Specialized;
using System.ComponentModel;
using System.Windows.Data;

namespace CafeReports;

public partial class CafeViewModel : ViewModelBase
{
    public ObservableCollection<Order> Orders { get; } = [];
    public ICollectionView OrdersView { get; }

    public CafeViewModel()
    {
        LoadSampleData();

        OrdersView = CollectionViewSource.GetDefaultView(Orders);
        OrdersView.Filter = FilterOrders;

        // 1. Слухаємо зміни СКЛАДУ колекції.
        Orders.CollectionChanged += Orders_CollectionChanged;

        // 2. Слухаємо зміни ВСЕРЕДИНІ кожного наявного елемента.
        foreach (var order in Orders)
            order.PropertyChanged += Order_PropertyChanged;

        RecalculateTotals();
    }

    private void Orders_CollectionChanged(object? sender, NotifyCollectionChangedEventArgs e)
    {
        // Відписуємось від тих, що пішли.
        if (e.OldItems is not null)
            foreach (Order order in e.OldItems)
                order.PropertyChanged -= Order_PropertyChanged;

        // Підписуємось на тих, що прийшли.
        if (e.NewItems is not null)
            foreach (Order order in e.NewItems)
                order.PropertyChanged += Order_PropertyChanged;

        // Дія Reset (наприклад, Orders.Clear()) не заповнює OldItems —
        // старі підписки там доводиться знімати заздалегідь, до виклику Clear().
        RecalculateTotals();
    }

    private void Order_PropertyChanged(object? sender, PropertyChangedEventArgs e)
    {
        // Реагуємо лише на поля, від яких залежать підсумки або фільтр.
        if (e.PropertyName is nameof(Order.Quantity)
                           or nameof(Order.UnitPrice)
                           or nameof(Order.Total))
        {
            RecalculateTotals();
        }
        else if (e.PropertyName is nameof(Order.Category)
                                or nameof(Order.ProductName))
        {
            // Змінилось поле, за яким фільтруємо й групуємо —
            // спершу перебудовуємо погляд, потім рахуємо підсумки.
            OrdersView.Refresh();
            RecalculateTotals();
        }
    }
}
```

:::danger[Часта помилка]
Метод `Clear()` у `ObservableCollection` кидає подію з дією `Reset`,
у якій `OldItems` дорівнює `null`. Тобто наведений вище код **не відпише**
старі елементи, і вони залишаться в пам'яті назавжди.

Якщо у вашому застосунку колекція очищається, зробіть власний метод:

```csharp
private void ClearOrders()
{
    foreach (var order in Orders)
        order.PropertyChanged -= Order_PropertyChanged;

    Orders.Clear();
}
```
:::

:::warning[Обережно]
Не викликайте `OrdersView.Refresh()` на **кожну** зміну властивості.
Якщо користувач саме редагує комірку, а ви перебудовуєте подання, рядок
може «втекти» з-під курсора або взагалі зникнути через фільтр — редагування
обірветься. Оновлюйте погляд тільки для тих полів, що беруть участь
у фільтрі, сортуванні чи групуванні.
:::

## Панель підсумків під таблицею

Найпростіший і найнадійніший спосіб показати підсумки — окрема панель під
таблицею. Вона не залежить від ширини стовпців, добре читається й легко
оформлюється.

```xml
<Border DockPanel.Dock="Bottom" Background="#F0F4F9"
        BorderBrush="#D6DEE8" BorderThickness="0,1,0,0" Padding="10,8">
    <StackPanel Orientation="Horizontal">
        <TextBlock Text="Замовлень:" Foreground="#546E7A" />
        <TextBlock Text="{Binding VisibleCount}" FontWeight="Bold" Margin="6,0,20,0" />

        <TextBlock Text="Порцій:" Foreground="#546E7A" />
        <TextBlock Text="{Binding ItemsCount}" FontWeight="Bold" Margin="6,0,20,0" />

        <TextBlock Text="Сума:" Foreground="#546E7A" />
        <TextBlock Text="{Binding TotalSum, StringFormat='{}{0:N2} ₴'}"
                   FontWeight="Bold" FontSize="14" Margin="6,0,20,0" />

        <TextBlock Text="Середній чек:" Foreground="#546E7A" />
        <TextBlock Text="{Binding AverageCheck, StringFormat='{}{0:N2} ₴'}"
                   FontWeight="Bold" Margin="6,0,0,0" />
    </StackPanel>
</Border>
```

## Підсумковий рядок під самою таблицею

А якщо хочеться «як в Excel» — щоб підсумок стояв рівно під своїм стовпцем?

Тут треба чесно сказати: **у `DataGrid` з WPF немає готового рядка підсумків**.
Властивості `RowFooter` не існує — її мають деякі платні бібліотеки, але не
сама платформа. Те, що є в `DataGrid` (`RowHeaderTemplate`,
`RowDetailsTemplate`), стосується окремих рядків, а не таблиці загалом.

Робоче рішення — покласти під таблицею власну панель і **прив'язати ширини
її комірок до фактичних ширин стовпців** `DataGrid`. Клас `DataGridColumn`
реалізує `INotifyPropertyChanged` і сповіщає про зміну `ActualWidth`, тож
підсумковий рядок їхатиме за стовпцями, коли користувач їх розтягує.

```xml
<!-- Таблиця -->
<DataGrid x:Name="OrdersGrid"
          ItemsSource="{Binding OrdersView}"
          AutoGenerateColumns="False"
          HeadersVisibility="Column"
          DockPanel.Dock="Top">
    <DataGrid.Columns>
        <DataGridTextColumn Header="№"       Width="50"  Binding="{Binding Number}" />
        <DataGridTextColumn Header="Позиція" Width="200" Binding="{Binding ProductName}" />
        <DataGridTextColumn Header="К-сть"   Width="70"  Binding="{Binding Quantity}" />
        <DataGridTextColumn Header="Сума"    Width="110"
                            Binding="{Binding Total, StringFormat='{}{0:N2}'}" />
    </DataGrid.Columns>
</DataGrid>

<!-- Підсумковий рядок: ширини синхронізовані зі стовпцями -->
<Border DockPanel.Dock="Top" Background="#E3EAF4"
        BorderBrush="#C3CEDD" BorderThickness="0,1,0,0" Padding="0,5">
    <StackPanel Orientation="Horizontal">
        <TextBlock Width="{Binding ElementName=OrdersGrid, Path=Columns[0].ActualWidth}" />

        <TextBlock Width="{Binding ElementName=OrdersGrid, Path=Columns[1].ActualWidth}"
                   Text="РАЗОМ" FontWeight="Bold" Padding="6,0" />

        <TextBlock Width="{Binding ElementName=OrdersGrid, Path=Columns[2].ActualWidth}"
                   Text="{Binding ItemsCount}" FontWeight="Bold" Padding="6,0" />

        <TextBlock Width="{Binding ElementName=OrdersGrid, Path=Columns[3].ActualWidth}"
                   Text="{Binding TotalSum, StringFormat='{}{0:N2}'}"
                   FontWeight="Bold" Padding="6,0" />
    </StackPanel>
</Border>
```

```
┌────┬──────────────────────┬───────┬───────────┐
│ №  │ Позиція              │ К-сть │   Сума    │
├────┼──────────────────────┼───────┼───────────┤
│ 1  │ Капучино             │   2   │    150,00 │
│ 2  │ Лате                 │   1   │     85,00 │
│ 3  │ Чізкейк              │   1   │    120,00 │
╞════╪══════════════════════╪═══════╪═══════════╡
│    │ РАЗОМ                │   4   │    355,00 │  ← окрема панель
└────┴──────────────────────┴───────┴───────────┘
     ▲ ширини взято з Columns[i].ActualWidth
```

:::note
Це рішення має одне обмеження: якщо таблиця прокручується горизонтально,
підсумковий рядок не поїде разом із нею. Для таблиць, які вміщаються по
ширині, це неважливо, а для широких зазвичай обирають просту панель
підсумків із попереднього пункту.
:::

## Друга таблиця: звіт за категоріями

Підсумкові числа — добре, розбивка — краще. Зробимо окрему модель рядка звіту
й окрему маленьку таблицю під основною.

```csharp
namespace CafeReports;

// Один рядок звіту. Тут сповіщення не потрібні:
// рядки звіту не редагуються, вони перебудовуються цілком.
public class CategorySummary
{
    public string Category { get; init; } = "";
    public int OrderCount { get; init; }
    public int ItemsCount { get; init; }
    public decimal Sum { get; init; }
    public double Share { get; init; }   // частка від загальної суми, 0..1
}
```

Будуємо звіт циклами. Щоб згрупувати без LINQ, використаємо словник:

```csharp
using System.Collections.Generic;

public ObservableCollection<CategorySummary> CategoryReport { get; } = [];

private void BuildCategoryReport()
{
    // Проміжні накопичувачі: категорія -> числа
    var orderCounts = new Dictionary<string, int>();
    var itemCounts = new Dictionary<string, int>();
    var sums = new Dictionary<string, decimal>();

    foreach (var element in OrdersView)
    {
        if (element is not Order order)
            continue;

        var key = order.Category;

        // Індексатор словника з перевіркою наявності ключа
        orderCounts[key] = orderCounts.GetValueOrDefault(key) + 1;
        itemCounts[key] = itemCounts.GetValueOrDefault(key) + order.Quantity;
        sums[key] = sums.GetValueOrDefault(key) + order.Total;
    }

    CategoryReport.Clear();

    foreach (var pair in sums)
    {
        CategoryReport.Add(new CategorySummary
        {
            Category = pair.Key,
            OrderCount = orderCounts[pair.Key],
            ItemsCount = itemCounts[pair.Key],
            Sum = pair.Value,
            Share = TotalSum == 0 ? 0 : (double)(pair.Value / TotalSum)
        });
    }
}
```

Показуємо звіт другою таблицею, з наочною смужкою частки:

```xml
<DataGrid ItemsSource="{Binding CategoryReport}"
          AutoGenerateColumns="False"
          IsReadOnly="True"
          HeadersVisibility="Column"
          Height="140">
    <DataGrid.Columns>
        <DataGridTextColumn Header="Категорія" Width="140"
                            Binding="{Binding Category}" />
        <DataGridTextColumn Header="Замовлень" Width="90"
                            Binding="{Binding OrderCount}" />
        <DataGridTextColumn Header="Порцій" Width="80"
                            Binding="{Binding ItemsCount}" />
        <DataGridTextColumn Header="Сума" Width="110"
                            Binding="{Binding Sum, StringFormat='{}{0:N2} ₴'}" />
        <DataGridTemplateColumn Header="Частка" Width="*">
            <DataGridTemplateColumn.CellTemplate>
                <DataTemplate>
                    <Grid Margin="4,2">
                        <ProgressBar Minimum="0" Maximum="1"
                                     Value="{Binding Share, Mode=OneWay}"
                                     Height="16" />
                        <TextBlock Text="{Binding Share, StringFormat='{}{0:P0}'}"
                                   HorizontalAlignment="Center" FontSize="11" />
                    </Grid>
                </DataTemplate>
            </DataGridTemplateColumn.CellTemplate>
        </DataGridTemplateColumn>
    </DataGrid.Columns>
</DataGrid>
```

## Експорт у CSV

Звіт, який не можна віддати комусь іншому, — половина звіту. Найпростіший
формат обміну табличними даними — **CSV** (comma-separated values): звичайний
текстовий файл, у якому рядок таблиці — це рядок файлу, а комірки розділені
роздільником.

Виглядає він так:

```
Номер;Час;Позиція;Категорія;Кількість;Ціна;Сума;Оплачено
1;14.09.2026 09:12;Капучино;Кава;2;75.00;150.00;так
2;14.09.2026 09:15;"Лате ""Ваніль""";Кава;1;85.00;85.00;так
3;14.09.2026 09:31;Чізкейк;Десерти;1;120.00;120.00;ні
```

Формат простий, але має три місця, де програма-початківець ламається.

### Пастка 1: роздільник усередині даних

Що станеться, якщо назва товару — «Лате, великий»? Кома всередині поля
розрубає рядок навпіл, і Excel побачить на один стовпець більше. Правило CSV
таке:

- якщо поле містить роздільник, лапки або перенесення рядка — обгортаємо
  поле в подвійні лапки;
- якщо всередині поля є подвійна лапка — подвоюємо її.

```csharp
private const char Separator = ';';

private static string EscapeCsv(string? value)
{
    var text = value ?? string.Empty;

    var needsQuotes = text.Contains(Separator)
                   || text.Contains('"')
                   || text.Contains('\n')
                   || text.Contains('\r');

    if (!needsQuotes)
        return text;

    // Подвоюємо кожну лапку й беремо все в лапки.
    return $"\"{text.Replace("\"", "\"\"")}\"";
}
```

:::danger[Часта помилка]
Експорт «в один рядок»:

```csharp
writer.WriteLine(string.Join(",", order.Number, order.ProductName, order.Total));
```

Це працює рівно доти, доки в даних немає ком. Перша ж назва «Лате, великий»
зсуває всі стовпці праворуч, і звіт стає сміттям. Ніколи не збирайте CSV
без екранування.
:::

### Пастка 2: кома чи крапка в числах

Той самий `decimal` зі значенням 150,5 у різних культурах перетворюється
на різний текст: `150,5` в українській та `150.5` в інвариантній. Якщо
записати число «як вийде», файл, створений на українській Windows,
не прочитається програмою, що очікує крапку, — а кома ще й зіллється
з роздільником полів.

Тому числа й дати у файли завжди пишуть у **`CultureInfo.InvariantCulture`** —
культурі «без країни», яка завжди дає крапку:

```csharp
using System.Globalization;

var priceText = order.UnitPrice.ToString("0.00", CultureInfo.InvariantCulture);
var timeText  = order.Time.ToString("yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture);
```

:::info[Цікаво]
Роздільник у CSV взагалі не обов'язково кома. Excel в українській та
більшості європейських локалізацій очікує **крапку з комою**, бо кома там
зайнята під десятковий розділювач. Тому для файлів, які відкриватимуть
в Excel, беріть `;`. Є ще хитрий трюк: якщо першим рядком файлу написати
`sep=;`, Excel прочитає цю вказівку й використає саме такий роздільник
незалежно від налаштувань системи.
:::

### Пастка 3: кракозябри в Excel

Найчастіше питання після першого експорту: «чому замість українських літер
якісь квадратики?». Ось чому.

У .NET рядки зберігаються в Unicode, і при записі у файл їх треба закодувати.
Стандартне кодування — UTF-8. Але Excel, відкриваючи `.csv` подвійним кліком,
**не намагається вгадати** кодування: він бере системне однобайтове
(для української Windows це Windows-1251) і показує сміття.

Розв'язок — **BOM** (byte order mark): три службові байти `EF BB BF`
на самому початку файлу, які означають «це UTF-8». Excel їх розпізнає
і читає файл правильно.

```
Файл БЕЗ BOM                     Файл З BOM
┌──────────────────────┐         ┌──────────────────────────┐
│ 4D 6F ... (текст)    │         │ EF BB BF 4D 6F ... (текст)│
└──────────────────────┘         └──────────────────────────┘
Excel: "РљР°РїСѓС‡РёРЅРѕ"          Excel: "Капучино"
```

:::warning[Обережно]
У .NET 8 конструктор `new StreamWriter(path)` записує UTF-8 **без BOM**.
Це свідома зміна порівняно зі старим .NET Framework, і саме через неї
студентські експорти відкриваються кракозябрами. Щоб BOM з'явився,
кодування треба задати явно:

```csharp
using var writer = new StreamWriter(path, false, new UTF8Encoding(true));
```

Параметр `true` у `UTF8Encoding` і означає «дописати BOM».
:::

### Повний код експорту

```csharp
using System;
using System.Globalization;
using System.IO;
using System.Text;
using System.Windows;
using Microsoft.Win32;

namespace CafeReports;

public partial class CafeViewModel
{
    private const char Separator = ';';

    private void ExportToCsv()
    {
        var dialog = new SaveFileDialog
        {
            Title = "Експорт звіту",
            Filter = "Файли CSV (*.csv)|*.csv|Усі файли (*.*)|*.*",
            DefaultExt = "csv",
            FileName = $"orders_{DateTime.Now:yyyy-MM-dd}.csv"
        };

        if (dialog.ShowDialog() != true)
            return;   // користувач передумав

        try
        {
            // UTF8Encoding(true) — з BOM, щоб Excel побачив українські літери.
            using var writer = new StreamWriter(dialog.FileName, false, new UTF8Encoding(true));

            // Заголовок
            writer.WriteLine(string.Join(Separator,
                EscapeCsv("Номер"), EscapeCsv("Час"), EscapeCsv("Позиція"),
                EscapeCsv("Категорія"), EscapeCsv("Кількість"),
                EscapeCsv("Ціна"), EscapeCsv("Сума"), EscapeCsv("Оплачено")));

            // Дані — саме те, що видно на екрані після фільтра
            foreach (var element in OrdersView)
            {
                if (element is not Order order)
                    continue;

                var fields = new[]
                {
                    order.Number.ToString(CultureInfo.InvariantCulture),
                    order.Time.ToString("yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture),
                    EscapeCsv(order.ProductName),
                    EscapeCsv(order.Category),
                    order.Quantity.ToString(CultureInfo.InvariantCulture),
                    order.UnitPrice.ToString("0.00", CultureInfo.InvariantCulture),
                    order.Total.ToString("0.00", CultureInfo.InvariantCulture),
                    order.IsPaid ? "так" : "ні"
                };

                writer.WriteLine(string.Join(Separator, fields));
            }

            // Порожній рядок і підсумки
            writer.WriteLine();
            writer.WriteLine($"Разом замовлень{Separator}{VisibleCount}");
            writer.WriteLine($"Разом порцій{Separator}{ItemsCount}");
            writer.WriteLine("Разом сума" + Separator +
                             TotalSum.ToString("0.00", CultureInfo.InvariantCulture));

            MessageBox.Show($"Збережено {VisibleCount} рядків у файл\n{dialog.FileName}",
                            "Експорт завершено",
                            MessageBoxButton.OK, MessageBoxImage.Information);
        }
        catch (IOException ex)
        {
            MessageBox.Show($"Не вдалося записати файл:\n{ex.Message}",
                            "Помилка", MessageBoxButton.OK, MessageBoxImage.Error);
        }
        catch (UnauthorizedAccessException)
        {
            MessageBox.Show("Немає прав на запис у цю теку.",
                            "Помилка", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }
}
```

Зверніть увагу на два рішення.

**Блок `try`/`catch`.** Файл може бути відкритий в Excel, теки може не бути,
диск може бути захищений від запису. Експорт без обробки винятків — це
застосунок, який падає в найневдаліший момент.

**Цикл по `OrdersView`, а не по `Orders`.** Користувач відфільтрував таблицю,
бачить 12 рядків із 80 і натискає «Експорт». Він очікує у файлі саме ці 12.
Якщо експортувати всю колекцію, це сприймається як помилка програми.

:::tip[Порада]
`SaveFileDialog` живе у просторі імен `Microsoft.Win32` — це той самий
клас, що ви бачили в темі 23. Якщо автодоповнення пропонує варіант з
іншого простору імен, оберіть саме `Microsoft.Win32`.
:::

## Друк

Якщо звіт треба не зберегти, а віддрукувати, WPF дає найкоротший можливий
шлях: `PrintDialog.PrintVisual` друкує будь-який візуальний елемент
(і `DataGrid` теж) так, як він виглядає на екрані. Достатньо трьох рядків:
створити `PrintDialog`, показати його через `ShowDialog()` і викликати
`PrintVisual(element, "опис завдання")`. Мінус очевидний — друкується рівно
те, що вміщається на екрані, без розбиття на сторінки; для багатосторінкових
звітів потрібен клас `FlowDocument`, але це вже поза межами нашої теми.

```csharp
private void PrintReport(System.Windows.Media.Visual element)
{
    var dialog = new System.Windows.Controls.PrintDialog();

    if (dialog.ShowDialog() == true)
        dialog.PrintVisual(element, "Звіт кав'ярні");
}
```

## Наскрізний приклад: облік замовлень кав'ярні

Збираємо все докупи: таблиця з редагуванням, фільтр за категорією й пошуком,
підсумки, звіт за категоріями, експорт.

```
┌─ Облік замовлень кав'ярні ─────────────────────────────────────────── ─ □ ✕ ┐
│ Пошук: [лате          ]  Категорія: [Усі      ▼]  [Додати] [Видалити] [Експорт] │
├──────┬──────────────────┬───────────┬───────┬─────────┬──────────┬──────────┤
│  №   │ Позиція          │ Категорія │ К-сть │  Ціна   │   Сума   │ Оплачено │
├──────┼──────────────────┼───────────┼───────┼─────────┼──────────┼──────────┤
│  1   │ Капучино         │ Кава      │   2   │   75,00 │   150,00 │    ☑     │
│  2   │ Лате ванільний   │ Кава      │   1   │   85,00 │    85,00 │    ☑     │
│  3   │ Чізкейк          │ Десерти   │   1   │  120,00 │   120,00 │    ☐     │
│  4   │ Еспресо          │ Кава      │   3   │   50,00 │   150,00 │    ☑     │
│  5   │ Чай імбирний     │ Чай       │   2   │   60,00 │   120,00 │    ☐     │
├──────┴──────────────────┴───────────┴───────┴─────────┴──────────┴──────────┤
│ Замовлень: 5   Порцій: 9   Сума: 625,00 ₴   Середній чек: 125,00 ₴          │
├─────────────────────────────────────────────────────────────────────────────┤
│ ЗВІТ ЗА КАТЕГОРІЯМИ                                                         │
│ ┌───────────┬───────────┬────────┬──────────┬───────────────────────────┐   │
│ │ Кава      │     3     │   6    │ 385,00 ₴ │ ▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░  62%    │   │
│ │ Десерти   │     1     │   1    │ 120,00 ₴ │ ▓▓▓▓░░░░░░░░░░░░░  19%    │   │
│ │ Чай       │     1     │   2    │ 120,00 ₴ │ ▓▓▓▓░░░░░░░░░░░░░  19%    │   │
│ └───────────┴───────────┴────────┴──────────┴───────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

Решта моделі подання:

```csharp
using System;
using System.Collections.ObjectModel;
using System.Windows.Input;

namespace CafeReports;

public partial class CafeViewModel : ViewModelBase
{
    private string _searchText = "";
    private string _categoryFilter = "Усі";
    private Order? _selectedOrder;

    public ObservableCollection<string> Categories { get; } =
        ["Кава", "Чай", "Десерти", "Сніданки"];

    public ObservableCollection<string> FilterCategories { get; } =
        ["Усі", "Кава", "Чай", "Десерти", "Сніданки"];

    public string SearchText
    {
        get => _searchText;
        set
        {
            if (SetProperty(ref _searchText, value))
            {
                OrdersView.Refresh();
                RecalculateTotals();
            }
        }
    }

    public string CategoryFilter
    {
        get => _categoryFilter;
        set
        {
            if (SetProperty(ref _categoryFilter, value))
            {
                OrdersView.Refresh();
                RecalculateTotals();
            }
        }
    }

    public Order? SelectedOrder
    {
        get => _selectedOrder;
        set => SetProperty(ref _selectedOrder, value);
    }

    public ICommand AddCommand { get; }
    public ICommand DeleteCommand { get; }
    public ICommand ExportCommand { get; }

    private bool FilterOrders(object element)
    {
        if (element is not Order order)
            return false;

        if (_categoryFilter != "Усі" && order.Category != _categoryFilter)
            return false;

        if (!string.IsNullOrWhiteSpace(_searchText) &&
            order.ProductName.IndexOf(_searchText, StringComparison.OrdinalIgnoreCase) < 0)
            return false;

        return true;
    }

    private void LoadSampleData()
    {
        Orders.Add(new Order { Number = 1, ProductName = "Капучино",       Category = "Кава",    Quantity = 2, UnitPrice = 75m,  IsPaid = true });
        Orders.Add(new Order { Number = 2, ProductName = "Лате ванільний", Category = "Кава",    Quantity = 1, UnitPrice = 85m,  IsPaid = true });
        Orders.Add(new Order { Number = 3, ProductName = "Чізкейк",        Category = "Десерти", Quantity = 1, UnitPrice = 120m, IsPaid = false });
        Orders.Add(new Order { Number = 4, ProductName = "Еспресо",        Category = "Кава",    Quantity = 3, UnitPrice = 50m,  IsPaid = true });
        Orders.Add(new Order { Number = 5, ProductName = "Чай імбирний",   Category = "Чай",     Quantity = 2, UnitPrice = 60m,  IsPaid = false });
    }

    private int NextNumber()
    {
        var max = 0;
        foreach (var order in Orders)
            if (order.Number > max)
                max = order.Number;

        return max + 1;
    }
}
```

Команди створюються в конструкторі — поруч із підписками:

```csharp
AddCommand = new RelayCommand(_ =>
{
    var order = new Order
    {
        Number = NextNumber(),
        ProductName = "Нова позиція",
        Category = "Кава",
        Quantity = 1,
        UnitPrice = 0m
    };

    Orders.Add(order);       // підписка на PropertyChanged станеться в обробнику
    SelectedOrder = order;
});

DeleteCommand = new RelayCommand(
    parameter =>
    {
        if (parameter is Order order)
            Orders.Remove(order);
    },
    parameter => parameter is Order);

ExportCommand = new RelayCommand(_ => ExportToCsv(),
                                 _ => VisibleCount > 0);
```

Вікно:

```xml
<Window x:Class="CafeReports.MainWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        xmlns:local="clr-namespace:CafeReports"
        Title="Облік замовлень кав'ярні" Height="620" Width="900">
    <Window.DataContext>
        <local:CafeViewModel />
    </Window.DataContext>

    <DockPanel Margin="10">

        <!-- Панель інструментів -->
        <StackPanel DockPanel.Dock="Top" Orientation="Horizontal" Margin="0,0,0,8">
            <TextBlock Text="Пошук:" VerticalAlignment="Center" Margin="0,0,6,0" />
            <TextBox Width="180"
                     Text="{Binding SearchText, UpdateSourceTrigger=PropertyChanged}" />

            <TextBlock Text="Категорія:" VerticalAlignment="Center" Margin="16,0,6,0" />
            <ComboBox Width="130"
                      ItemsSource="{Binding FilterCategories}"
                      SelectedItem="{Binding CategoryFilter}" />

            <Button Content="Додати" Command="{Binding AddCommand}"
                    Padding="10,3" Margin="16,0,0,0" />
            <Button Content="Видалити" Command="{Binding DeleteCommand}"
                    CommandParameter="{Binding SelectedOrder}"
                    Padding="10,3" Margin="6,0,0,0" />
            <Button Content="Експорт у CSV" Command="{Binding ExportCommand}"
                    Padding="10,3" Margin="6,0,0,0" />
        </StackPanel>

        <!-- Звіт за категоріями -->
        <GroupBox DockPanel.Dock="Bottom" Header="Звіт за категоріями"
                  Margin="0,8,0,0" Height="160">
            <DataGrid ItemsSource="{Binding CategoryReport}"
                      AutoGenerateColumns="False" IsReadOnly="True"
                      HeadersVisibility="Column" AlternationCount="2"
                      AlternatingRowBackground="#F7F9FC">
                <DataGrid.Columns>
                    <DataGridTextColumn Header="Категорія" Width="140"
                                        Binding="{Binding Category}" />
                    <DataGridTextColumn Header="Замовлень" Width="90"
                                        Binding="{Binding OrderCount}" />
                    <DataGridTextColumn Header="Порцій" Width="80"
                                        Binding="{Binding ItemsCount}" />
                    <DataGridTextColumn Header="Сума" Width="110"
                                        Binding="{Binding Sum, StringFormat='{}{0:N2} ₴'}" />
                    <DataGridTemplateColumn Header="Частка" Width="*">
                        <DataGridTemplateColumn.CellTemplate>
                            <DataTemplate>
                                <Grid Margin="4,2">
                                    <ProgressBar Minimum="0" Maximum="1" Height="16"
                                                 Value="{Binding Share, Mode=OneWay}" />
                                    <TextBlock Text="{Binding Share, StringFormat='{}{0:P0}'}"
                                               FontSize="11"
                                               HorizontalAlignment="Center" />
                                </Grid>
                            </DataTemplate>
                        </DataGridTemplateColumn.CellTemplate>
                    </DataGridTemplateColumn>
                </DataGrid.Columns>
            </DataGrid>
        </GroupBox>

        <!-- Панель підсумків -->
        <Border DockPanel.Dock="Bottom" Background="#F0F4F9"
                BorderBrush="#D6DEE8" BorderThickness="0,1,0,0" Padding="10,8">
            <StackPanel Orientation="Horizontal">
                <TextBlock Text="Замовлень:" Foreground="#546E7A" />
                <TextBlock Text="{Binding VisibleCount}" FontWeight="Bold" Margin="6,0,20,0" />
                <TextBlock Text="Порцій:" Foreground="#546E7A" />
                <TextBlock Text="{Binding ItemsCount}" FontWeight="Bold" Margin="6,0,20,0" />
                <TextBlock Text="Сума:" Foreground="#546E7A" />
                <TextBlock Text="{Binding TotalSum, StringFormat='{}{0:N2} ₴'}"
                           FontWeight="Bold" FontSize="14" Margin="6,0,20,0" />
                <TextBlock Text="Середній чек:" Foreground="#546E7A" />
                <TextBlock Text="{Binding AverageCheck, StringFormat='{}{0:N2} ₴'}"
                           FontWeight="Bold" Margin="6,0,0,0" />
            </StackPanel>
        </Border>

        <!-- Основна таблиця -->
        <DataGrid x:Name="OrdersGrid"
                  ItemsSource="{Binding OrdersView}"
                  SelectedItem="{Binding SelectedOrder}"
                  AutoGenerateColumns="False"
                  CanUserAddRows="False"
                  SelectionUnit="FullRow"
                  AlternationCount="2"
                  AlternatingRowBackground="#F7F9FC">
            <DataGrid.Columns>
                <DataGridTextColumn Header="№" Width="50" IsReadOnly="True"
                                    Binding="{Binding Number}" />

                <DataGridTextColumn Header="Позиція" Width="*"
                                    Binding="{Binding ProductName,
                                              UpdateSourceTrigger=LostFocus}" />

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

                <DataGridTextColumn Header="К-сть" Width="70"
                                    Binding="{Binding Quantity}" />

                <DataGridTextColumn Header="Ціна" Width="90"
                                    Binding="{Binding UnitPrice, StringFormat='{}{0:N2}'}" />

                <DataGridTextColumn Header="Сума" Width="110" IsReadOnly="True"
                                    Binding="{Binding Total, StringFormat='{}{0:N2}'}" />

                <DataGridCheckBoxColumn Header="Оплачено" Width="80"
                                        Binding="{Binding IsPaid}" />
            </DataGrid.Columns>
        </DataGrid>
    </DockPanel>
</Window>
```

Вивід у файлі після експорту (фільтр «Кава»):

```
Номер;Час;Позиція;Категорія;Кількість;Ціна;Сума;Оплачено
1;2026-09-14 09:12;Капучино;Кава;2;75.00;150.00;так
2;2026-09-14 09:15;Лате ванільний;Кава;1;85.00;85.00;так
4;2026-09-14 09:40;Еспресо;Кава;3;50.00;150.00;так

Разом замовлень;3
Разом порцій;6
Разом сума;385.00
```

## Типові помилки

1. **`List` замість `ObservableCollection`.** Кнопка «Додати» ніби працює
   (об'єкт справді потрапляє в список), але на екрані нічого не змінюється,
   і підсумки теж стоять. Правильно: `ObservableCollection<T>` скрізь,
   де вміст змінюється.

2. **Підсумки як звичайні властивості без сповіщення.** Запис
   `public decimal TotalSum { get; set; }` виглядає нормально, але
   `TextBlock` прочитає значення один раз при завантаженні вікна й більше
   ніколи. Правильно: `SetProperty` (тобто `OnPropertyChanged`) у сетері —
   або обчислювана властивість плюс явний виклик
   `OnPropertyChanged(nameof(TotalSum))` після перерахунку.

3. **Підписка тільки на `CollectionChanged`.** Додавання рядка підсумок
   оновлює, а редагування кількості в наявному рядку — ні. Правильно:
   слухати ще й `PropertyChanged` кожного елемента, підписуючись
   і відписуючись у обробнику `CollectionChanged`.

4. **`AutoGenerateColumns="True"` у робочому застосунку.** Англійські
   заголовки, службові поля на видноті й вигляд, який ламається від
   перейменування властивості. Правильно: явні стовпці.

5. **Експорт через `string.Join(",", ...)` без екранування.** Перша ж кома
   або лапка в назві товару зсуває стовпці. Правильно: функція `EscapeCsv`
   для кожного текстового поля.

6. **`Refresh()` у циклі.** Тисяча перебудов подання підряд вішає інтерфейс
   на кілька секунд. Правильно: один виклик після циклу або блок
   `using (View.DeferRefresh())`.

7. **Експорт усієї колекції замість видимої.** Користувач відфільтрував
   таблицю до 12 рядків, а у файлі отримав 80. Правильно: цикл
   по `ICollectionView`.

8. **Файл без BOM.** В Excel замість української — квадратики й знаки питання.
   Правильно: `new StreamWriter(path, false, new UTF8Encoding(true))`.
