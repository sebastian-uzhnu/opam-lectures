---
sidebar_position: 2
---

# INotifyPropertyChanged та ObservableCollection

## Значення змінилось, а екран — ні

Закінчимо експеримент, на якому спинилися. Ось повний код вікна, де кнопка
підвищує ціну товару:

```xml
<Window x:Class="NotifyDemo.MainWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Чому не оновлюється?" Height="200" Width="360">
    <StackPanel Margin="16">
        <TextBlock Text="{Binding Name}" FontSize="18" FontWeight="Bold"/>
        <TextBlock Text="{Binding Price, StringFormat=Ціна: {0:N2} грн}"
                   FontSize="16" Margin="0,6"/>
        <Button x:Name="RaisePriceButton" Content="Підняти ціну на 10 грн"
                Padding="8,4" Margin="0,12,0,0"
                Click="RaisePriceButton_Click"/>
    </StackPanel>
</Window>
```

```csharp
using System.Windows;

namespace NotifyDemo;

public class Product
{
    public string Name { get; set; } = "";
    public decimal Price { get; set; }
}

public partial class MainWindow : Window
{
    private readonly Product product = new() { Name = "Кава мелена", Price = 249.50m };

    public MainWindow()
    {
        InitializeComponent();
        DataContext = product;
    }

    private void RaisePriceButton_Click(object sender, RoutedEventArgs e)
    {
        product.Price += 10;

        // перевіримо, що дані справді змінились
        System.Diagnostics.Debug.WriteLine($"У пам'яті: {product.Price}");
    }
}
```

Натискаємо кнопку тричі. У вікні Output:

**Вивід:**

```
У пам'яті: 259,50
У пам'яті: 269,50
У пам'яті: 279,50
```

А на екрані все ще `Ціна: 249,50 грн`.

Чому? Пригадайте схему з попереднього підрозділу: прив'язка — це живий об'єкт
`BindingExpression`, який **підписаний на сповіщення про зміни джерела**.
Проблема в тому, що наш `Product` жодних сповіщень не надсилає. Звичайна
автовластивість — це просто поле з методами доступу; коли їй присвоюють нове
значення, ніхто у світі про це не дізнається.

```
   product.Price += 10
           │
           ▼
   ┌───────────────┐
   │ поле _price   │  значення змінилось
   └───────────────┘
           │
           ✗  нікому не повідомлено
           │
   ┌───────────────┐
   │  TextBlock    │  показує старе значення
   └───────────────┘
```

Отже, джерело мусить уміти **кричати**: «моя властивість `Price` щойно змінилась».
Для цього у .NET є стандартний інтерфейс.

## Інтерфейс INotifyPropertyChanged

**`INotifyPropertyChanged`** — інтерфейс із простору імен
`System.ComponentModel`, який складається з однієї-єдиної події:

```csharp
public interface INotifyPropertyChanged
{
    event PropertyChangedEventHandler? PropertyChanged;
}
```

`PropertyChangedEventHandler` — це делегат із двома параметрами: відправник
і `PropertyChangedEventArgs`, у якого є єдина властивість `PropertyName` —
рядок з іменем зміненої властивості.

Домовленість проста: **як тільки значення властивості змінилось, об'єкт
викликає подію й передає ім'я цієї властивості**. WPF, який підписаний на цю
подію, чує ім'я, звіряє його зі своїм `Path` і, якщо збігається, перечитує
значення.

Перепишемо `Product` «вручну», без жодних скорочень, щоб побачити механіку:

```csharp
using System.ComponentModel;

namespace NotifyDemo;

public class Product : INotifyPropertyChanged
{
    private string name = "";
    private decimal price;

    public event PropertyChangedEventHandler? PropertyChanged;

    public string Name
    {
        get => name;
        set
        {
            if (name == value)          // нічого не змінилось — не турбуємо інтерфейс
                return;

            name = value;
            OnPropertyChanged(nameof(Name));
        }
    }

    public decimal Price
    {
        get => price;
        set
        {
            if (price == value)
                return;

            price = value;
            OnPropertyChanged(nameof(Price));
        }
    }

    // Захищений метод, щоб нащадки теж могли надсилати сповіщення
    protected void OnPropertyChanged(string propertyName)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
    }
}
```

Тепер той самий приклад з кнопкою працює: ціна на екрані росте разом
із ціною в пам'яті. Жодного рядка у code-behind міняти не довелося.

Ось повний ланцюжок:

```
   product.Price = 259.50
            │
            ▼
   ┌────────────────────────┐
   │ set: поле price оновлено│
   └───────────┬────────────┘
               ▼
   ┌────────────────────────────────────────┐
   │ PropertyChanged?.Invoke(this,          │
   │     new PropertyChangedEventArgs("Price"))│
   └───────────┬────────────────────────────┘
               ▼
   ┌────────────────────────────────────────┐
   │ BindingExpression чує подію            │
   │ порівнює: "Price" == Path("Price") ?   │  так
   └───────────┬────────────────────────────┘
               ▼
   ┌────────────────────────────────────────┐
   │ читає product.Price ще раз             │
   │ застосовує StringFormat                │
   │ пише у TextBlock.Text                  │
   └────────────────────────────────────────┘
               ▼
        на екрані: Ціна: 259,50 грн
```

:::info Цікаво
Якщо передати в `PropertyChangedEventArgs` порожній рядок або `null`, WPF
вважає, що змінилися **всі** властивості об'єкта, і перечитує кожну прив'язку
до нього. Іноді це зручно (після завантаження об'єкта з файлу), але як
щоденна практика — погано: інтерфейс перемальовує те, що не змінювалось.
:::

## Не пишіть імена властивостей рядками

У коді вище я написав `nameof(Name)`, а не `"Name"`. Це важливо.
`nameof` — оператор часу компіляції: він перетворюється на рядок, але компілятор
перевіряє, що така властивість існує. Якщо ви переіменуєте `Name` на `Title`,
`nameof(Title)` оновиться разом із ним (Visual Studio зробить це сама),
а рядок `"Name"` мовчки залишиться і зламає прив'язку.

Але є ще краще. Атрибут **`[CallerMemberName]`** змушує компілятор
підставити ім'я члена, з якого зроблено виклик, автоматично:

```csharp
using System.ComponentModel;
using System.Runtime.CompilerServices;

protected void OnPropertyChanged([CallerMemberName] string? propertyName = null)
{
    PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
}
```

Тепер у сеттері достатньо написати `OnPropertyChanged()` без аргументів —
компілятор сам підставить `"Price"`, бо виклик стався всередині властивості `Price`:

```csharp
public decimal Price
{
    get => price;
    set
    {
        if (price == value) return;
        price = value;
        OnPropertyChanged();          // ім'я підставиться саме
    }
}
```

:::warning Обережно
`[CallerMemberName]` працює лише тоді, коли параметр має **значення за
замовчуванням** (`= null`). Без нього компілятор вимагатиме передати аргумент
і атрибут втратить сенс.
:::

## Власний базовий клас ObservableObject

Писати одне й те саме в кожному класі моделі — нудно й помилконебезпечно.
Винесемо все спільне у базовий клас. Такий клас у різних бібліотеках звуть
`ObservableObject`, `BindableBase`, `NotifyPropertyChangedBase` — суть одна.
Ми напишемо свій, без сторонніх пакетів:

```csharp
using System.Collections.Generic;
using System.ComponentModel;
using System.Runtime.CompilerServices;

namespace NotifyDemo;

/// <summary>
/// Базовий клас для будь-якого об'єкта, до якого прив'язується інтерфейс.
/// </summary>
public abstract class ObservableObject : INotifyPropertyChanged
{
    public event PropertyChangedEventHandler? PropertyChanged;

    /// Надіслати сповіщення про зміну властивості.
    protected void OnPropertyChanged([CallerMemberName] string? propertyName = null)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
    }

    /// <summary>
    /// Присвоює полю нове значення і, якщо воно справді змінилось,
    /// надсилає сповіщення. Повертає true, якщо зміна відбулася.
    /// </summary>
    protected bool SetProperty<T>(ref T field, T value,
                                  [CallerMemberName] string? propertyName = null)
    {
        // EqualityComparer<T>.Default коректно порівнює і структури, і класи,
        // і не падає, якщо field дорівнює null
        if (EqualityComparer<T>.Default.Equals(field, value))
            return false;

        field = value;
        OnPropertyChanged(propertyName);
        return true;
    }
}
```

Розберімо `SetProperty` по частинах:

- `ref T field` — передаємо саме **поле**, щоб метод міг його змінити.
- `EqualityComparer<T>.Default.Equals(...)` — універсальне порівняння.
  Оператор `==` тут не підходить: для узагальненого `T` компілятор не знає,
  чи він визначений.
- перевірка на рівність — не оптимізація, а захист. Без неї двостороння
  прив'язка може зациклитись: інтерфейс пише в джерело, джерело кричить
  «я змінилось», інтерфейс перечитує, пише знову…
- `[CallerMemberName]` — ім'я властивості підставиться само.
- повертає `bool` — це знадобиться нижче, для обчислюваних властивостей.

Модель з базовим класом стає короткою і читабельною:

```csharp
namespace NotifyDemo;

public class Product : ObservableObject
{
    private string name = "";
    private decimal price;
    private int quantity;

    public string Name
    {
        get => name;
        set => SetProperty(ref name, value);
    }

    public decimal Price
    {
        get => price;
        set => SetProperty(ref price, value);
    }

    public int Quantity
    {
        get => quantity;
        set => SetProperty(ref quantity, value);
    }
}
```

Три рядки на властивість замість дев'яти. Саме цей шаблон ви бачитимете
далі в усьому курсі — і в темі 25 з `DataGrid`, і в темах 29–31, де
ці самі об'єкти зберігатимуться у JSON і в базі даних.

:::tip Порада
Створіть `ObservableObject.cs` один раз і копіюйте його у кожен новий
WPF-проєкт. Це десять рядків коду, які економлять сотні. Для великих проєктів
існують готові бібліотеки з таким базовим класом, але в курсі ми обходимось
власним — корисно розуміти, що в них усередині рівно те саме.
:::

## Обчислювані властивості

Часто на екрані треба показати не саме поле, а щось похідне: суму,
повне ім'я, ознаку «дорого». Такі властивості мають лише геттер:

```csharp
public class Product : ObservableObject
{
    private decimal price;
    private int quantity;

    public decimal Price
    {
        get => price;
        set
        {
            if (SetProperty(ref price, value))
            {
                OnPropertyChanged(nameof(Total));      // сума теж змінилась
                OnPropertyChanged(nameof(IsExpensive));
            }
        }
    }

    public int Quantity
    {
        get => quantity;
        set
        {
            if (SetProperty(ref quantity, value))
                OnPropertyChanged(nameof(Total));
        }
    }

    // Обчислювані властивості: поля немає, лише розрахунок
    public decimal Total => price * quantity;

    public bool IsExpensive => price > 1000m;
}
```

Ось де знадобилось `bool`, яке повертає `SetProperty`: додаткові сповіщення
надсилаються **лише якщо значення справді змінилось**.

Прив'язка до `Total` у XAML нічим не відрізняється від прив'язки до звичайної
властивості — інтерфейсу байдуже, звідки береться значення:

```xml
<TextBlock Text="{Binding Total, StringFormat=Разом: {0:N2} грн}"/>
```

:::danger Часта помилка
Забути сповістити про обчислювану властивість. Ціна змінилась, `Price` на екрані
оновився, а `Total` завмер на старому числі — бо про `Total` ніхто не кричав.
Правило: **якщо властивість B рахується з властивості A, то в сеттері A
має бути `OnPropertyChanged(nameof(B))`**.
:::

## Колекції: чому List не працює

Тепер той самий сюжет, але зі списками. Візьмемо `ItemsControl` (або `ListBox`)
і прив'яжемо його до `List<string>`:

```csharp
public partial class MainWindow : Window
{
    private readonly List<string> tasks = ["Купити хліб", "Помити посуд"];

    public MainWindow()
    {
        InitializeComponent();
        TaskList.ItemsSource = tasks;
    }

    private void AddButton_Click(object sender, RoutedEventArgs e)
    {
        tasks.Add("Нове завдання");     // список росте...
    }
}
```

Натискаємо кнопку — у `tasks` уже чотири, п'ять, шість елементів,
а `ListBox` вперто показує два.

Причина та сама: **`List<T>` нікому не повідомляє, що його вміст змінився**.
`INotifyPropertyChanged` тут не допоможе, бо сам об'єкт-список не змінювався:
це те саме посилання, та сама колекція. Змінився її **вміст**, а для цього
потрібен інший інтерфейс — **`INotifyCollectionChanged`** з простору імен
`System.Collections.Specialized`. Він має одну подію `CollectionChanged`,
яка повідомляє, що саме сталося: додали, видалили, замінили, очистили,
і за яким індексом.

Реалізовувати його самостійно не треба. У .NET є готовий клас
**`ObservableCollection<T>`** (простір імен `System.Collections.ObjectModel`) —
це майже той самий `List<T>`, але з подією:

```csharp
using System.Collections.ObjectModel;

private readonly ObservableCollection<string> tasks =
    ["Купити хліб", "Помити посуд"];
```

Одне слово змінили — і кнопка запрацювала.

```
      List<T>                          ObservableCollection<T>

  tasks.Add("Нове")                tasks.Add("Нове")
        │                                 │
        ▼                                 ▼
  ┌──────────────┐                 ┌──────────────┐
  │ елемент у    │                 │ елемент у    │
  │ колекції     │                 │ колекції     │
  └──────────────┘                 └──────┬───────┘
        │                                 ▼
        ✗ тиша                   ┌────────────────────────┐
        │                        │ CollectionChanged      │
        ▼                        │ Action = Add, Index = 2│
  ┌──────────────┐               └──────┬─────────────────┘
  │  ListBox     │                      ▼
  │ (2 елементи) │               ┌──────────────┐
  └──────────────┘               │  ListBox     │
                                 │ (3 елементи) │
                                 └──────────────┘
```

| Клас | Коли брати | Коли не брати |
|---|---|---|
| `List<T>` | внутрішні обчислення, дані, які не показуються напряму | будь-що у `ItemsSource`, що змінюватиметься |
| `ObservableCollection<T>` | усе, що показує список і може змінюватись | великі обсяги суто обчислювальних даних (трохи повільніше) |

:::info Цікаво
`ObservableCollection<T>` реалізує **і** `INotifyCollectionChanged`, **і**
`INotifyPropertyChanged` — друге потрібне, щоб повідомляти про зміну
властивості `Count`. Тому підпис «Завдань: 5» можна прив'язати
прямо до `{Binding Tasks.Count}`, і він оновлюватиметься сам.
:::

## Чого ObservableCollection не вміє

Найпоширеніше непорозуміння теми. `ObservableCollection` стежить за **складом**
колекції: додали елемент, видалили, переставили, очистили. Вона **нічого**
не знає про те, що відбувається **всередині** елементів.

```csharp
// Це побачить інтерфейс — змінився склад колекції
products.Add(new Product { Name = "Чай", Price = 120 });
products.RemoveAt(0);

// А цього інтерфейс не побачить, якщо Product не реалізує INotifyPropertyChanged
products[0].Price = 999;
```

Тому правило звучить так: **колекція має бути `ObservableCollection`, а її
елементи — реалізовувати `INotifyPropertyChanged`**. Одне без іншого дає
наполовину живий інтерфейс.

```
  ObservableCollection<Product>
  ┌──────────────────────────────────────┐
  │  [0] ──▶ Product  (ObservableObject) │  ← INotifyPropertyChanged
  │  [1] ──▶ Product  (ObservableObject) │    стежить за полями елемента
  │  [2] ──▶ Product  (ObservableObject) │
  └──────────────────────────────────────┘
          ▲
          │ INotifyCollectionChanged
          │ стежить за складом списку
```

## Робочий приклад: список товарів

Зберімо все докупи. Вікно зі списком товарів, кнопками «Додати» і «Видалити»
та полями для редагування вибраного товару. Ми ще не знаємо MVVM, тому
використаємо code-behind — але зверніть увагу, наскільки він уже схуднув
порівняно з темою 23.

**Макет вікна:**

```
┌──────────────────────────────────────────────────────────┐
│ Склад                                                    │
├──────────────────────────┬───────────────────────────────┤
│ Кава мелена    249,50 ₴  │  Назва:    [Кава мелена     ] │
│ Чай зелений    120,00 ₴  │  Ціна:     [249,50          ] │
│ Цукор           38,00 ₴  │  Кількість:[3               ] │
│                          │                               │
│                          │  Разом: 748,50 грн            │
├──────────────────────────┴───────────────────────────────┤
│ Товарів: 3        [ Додати ]  [ Видалити вибраний ]      │
└──────────────────────────────────────────────────────────┘
```

**Модель:**

```csharp
namespace ProductList;

public class Product : ObservableObject
{
    private string name = "Новий товар";
    private decimal price;
    private int quantity = 1;

    public string Name
    {
        get => name;
        set => SetProperty(ref name, value);
    }

    public decimal Price
    {
        get => price;
        set
        {
            if (SetProperty(ref price, value))
                OnPropertyChanged(nameof(Total));
        }
    }

    public int Quantity
    {
        get => quantity;
        set
        {
            if (SetProperty(ref quantity, value))
                OnPropertyChanged(nameof(Total));
        }
    }

    public decimal Total => price * quantity;
}
```

**XAML:**

```xml
<Window x:Class="ProductList.MainWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Склад" Height="320" Width="640">
    <Grid Margin="12">
        <Grid.RowDefinitions>
            <RowDefinition Height="*"/>
            <RowDefinition Height="Auto"/>
        </Grid.RowDefinitions>
        <Grid.ColumnDefinitions>
            <ColumnDefinition Width="*"/>
            <ColumnDefinition Width="260"/>
        </Grid.ColumnDefinitions>

        <!-- Список товарів -->
        <ListBox x:Name="ProductsList"
                 ItemsSource="{Binding Products}"
                 SelectedItem="{Binding SelectedProduct}">
            <ListBox.ItemTemplate>
                <DataTemplate>
                    <DockPanel Margin="2">
                        <TextBlock DockPanel.Dock="Right" Width="90"
                                   TextAlignment="Right"
                                   Text="{Binding Price, StringFormat={}{0:N2} ₴}"/>
                        <TextBlock Text="{Binding Name}"/>
                    </DockPanel>
                </DataTemplate>
            </ListBox.ItemTemplate>
        </ListBox>

        <!-- Редактор вибраного товару -->
        <StackPanel Grid.Column="1" Margin="12,0,0,0"
                    DataContext="{Binding SelectedProduct}">
            <TextBlock Text="Назва:"/>
            <TextBox Text="{Binding Name, UpdateSourceTrigger=PropertyChanged}"/>

            <TextBlock Text="Ціна:" Margin="0,8,0,0"/>
            <TextBox Text="{Binding Price, UpdateSourceTrigger=PropertyChanged}"/>

            <TextBlock Text="Кількість:" Margin="0,8,0,0"/>
            <TextBox Text="{Binding Quantity, UpdateSourceTrigger=PropertyChanged}"/>

            <TextBlock Margin="0,16,0,0" FontWeight="Bold"
                       Text="{Binding Total, StringFormat=Разом: {0:N2} грн}"/>
        </StackPanel>

        <!-- Нижня панель -->
        <DockPanel Grid.Row="1" Grid.ColumnSpan="2" Margin="0,12,0,0">
            <TextBlock VerticalAlignment="Center"
                       Text="{Binding Products.Count, StringFormat=Товарів: {0}}"/>
            <StackPanel Orientation="Horizontal" HorizontalAlignment="Right">
                <Button Content="Додати" Padding="12,4" Margin="6,0"
                        Click="AddButton_Click"/>
                <Button Content="Видалити вибраний" Padding="12,4"
                        Click="DeleteButton_Click"/>
            </StackPanel>
        </DockPanel>

    </Grid>
</Window>
```

**Code-behind:**

```csharp
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Windows;

namespace ProductList;

public partial class MainWindow : Window, INotifyPropertyChanged
{
    private Product? selectedProduct;

    public ObservableCollection<Product> Products { get; } =
    [
        new Product { Name = "Кава мелена", Price = 249.50m, Quantity = 3 },
        new Product { Name = "Чай зелений", Price = 120.00m, Quantity = 5 },
        new Product { Name = "Цукор",       Price = 38.00m,  Quantity = 10 }
    ];

    public Product? SelectedProduct
    {
        get => selectedProduct;
        set
        {
            selectedProduct = value;
            PropertyChanged?.Invoke(this,
                new PropertyChangedEventArgs(nameof(SelectedProduct)));
        }
    }

    public event PropertyChangedEventHandler? PropertyChanged;

    public MainWindow()
    {
        InitializeComponent();
        DataContext = this;               // тимчасове рішення, у MVVM буде інакше
    }

    private void AddButton_Click(object sender, RoutedEventArgs e)
    {
        var product = new Product { Name = "Новий товар", Price = 0, Quantity = 1 };
        Products.Add(product);
        SelectedProduct = product;        // одразу виділяємо для редагування
    }

    private void DeleteButton_Click(object sender, RoutedEventArgs e)
    {
        if (SelectedProduct is null)
            return;

        Products.Remove(SelectedProduct);
        SelectedProduct = null;
    }
}
```

Що тут працює саме собою, без жодного рядка коду:

1. **Додавання.** `Products.Add(...)` — новий рядок з'являється у списку,
   бо це `ObservableCollection`.
2. **Видалення.** Так само.
3. **Лічильник.** «Товарів: 3» оновлюється, бо `ObservableCollection`
   сповіщає про зміну `Count`.
4. **Редагування назви.** Друкуєте у полі «Назва» — текст у списку ліворуч
   змінюється синхронно, бо `Product` реалізує `INotifyPropertyChanged`,
   а `UpdateSourceTrigger=PropertyChanged` віддає значення на кожну літеру.
5. **Сума.** «Разом» перераховується при зміні ціни або кількості, бо в їхніх
   сеттерах є `OnPropertyChanged(nameof(Total))`.
6. **Перемикання товару.** Клацнули інший рядок — праворуч з'явились його поля,
   бо панель редактора має `DataContext="{Binding SelectedProduct}"`,
   а `SelectedProduct` сповіщає про зміну.

Приберіть будь-яку з цих деталей — і відповідний пункт перестане працювати.
Спробуйте: замініть `ObservableCollection` на `List` і натисніть «Додати».
Потім поверніть назад, але приберіть `: ObservableObject` у `Product`
і поредагуйте назву. Ці два експерименти варті години пояснень.

:::warning Обережно
`DataContext = this` у конструкторі вікна — це навчальний милиць, щоб показати
механіку без нових понять. У реальному коді так не роблять: вікно перетворюється
на змішанину інтерфейсу й даних, яку неможливо протестувати. У підрозділі про
MVVM ми винесемо `Products`, `SelectedProduct` і кнопки в окремий клас.
:::

## Типові помилки

- **Клас-модель без `INotifyPropertyChanged`.** Прив'язка показує початкове
  значення й більше не оновлюється. Симптом: у налагоджувачі дані правильні,
  на екрані — старі.
- **`List` замість `ObservableCollection` у `ItemsSource`.** Додавання
  й видалення не видно. Симптом: колекція росте, список стоїть.
- **Присвоєння полю замість властивості всередині класу.** Написали
  `price = 100;` замість `Price = 100;` — сеттер не викликався, сповіщення немає.
- **Заміна всієї колекції новим об'єктом.** `Products = new ObservableCollection...`
  без сповіщення про зміну властивості `Products` — список стане порожнім
  або застигне. Або сповіщайте, або не замінюйте: `Clear()` плюс `Add()` у циклі.
- **Забуте сповіщення для обчислюваної властивості.** `Total` не перераховується,
  бо про нього ніхто не повідомив.
