---
sidebar_position: 1
---

# Прив'язка даних: від ручного оновлення до автоматичного

## П'ять місць, де легко забути

Згадаймо міні-редактор із теми 23. У ньому було поле з текстом, лічильник символів,
ім'я файлу у рядку стану, підпис стану («Змінено», «Збережено») і заголовок вікна.
Реальних **даних** там усього три: шлях до файлу, ознака «є незбережені зміни»
і сам текст. Але щоб екран показував правду, ці три значення доводилось
вручну «розносити» по п'яти елементах:

```csharp
private void ContentBox_TextChanged(object sender, TextChangedEventArgs e)
{
    isModified = true;
    CharCountText.Text = $"Символів: {ContentBox.Text.Length}";
    StatusText.Text = "Змінено";
    UpdateTitle();
}

private void UpdateTitle()
{
    var name = currentFilePath is null
        ? "без назви"
        : Path.GetFileName(currentFilePath);

    FileNameText.Text = name;                       // рядок стану
    Title = isModified                              // заголовок вікна
        ? $"Блокнот ОПАМ — {name}*"
        : $"Блокнот ОПАМ — {name}";
}
```

Поки методів двоє, це ще терпимо. Але команд у редакторі було шість, і **кожна**
з них мусила не забути дописати три рядки: змінити `StatusText`, змінити
`isModified`, викликати `UpdateTitle()`. Варто пропустити один виклик
у одній гілці `if` — і програма працює, помилок немає, а користувач бачить
у заголовку зірочку над уже збереженим файлом. Такі баги не падають зі стеком
винятку. Вони просто тихо брешуть користувачеві.

Проблема тут не в неуважності студента. Проблема в архітектурі: **дані живуть
окремо, елементи інтерфейсу окремо, а зв'язок між ними існує тільки у вашій
голові й у рядках присвоєння**. Кожен новий елемент на екрані — це ще одне
місце, яке треба не забути оновити.

WPF пропонує інший підхід. Замість того щоб раз за разом штовхати дані
в елементи, ми один раз **оголошуємо зв'язок**: «текст цього підпису — це
довжина цього рядка». Далі платформа стежить за цим сама.

Це і є **прив'язка даних (data binding)** — механізм WPF, який автоматично
синхронізує значення властивості елемента інтерфейсу зі значенням властивості
якогось об'єкта.

:::info Цікаво
Прив'язка даних — не винахід WPF, але саме у WPF вона вперше стала основою
всієї платформи, а не додатковою зручністю. Тому властивості залежності з теми 22
влаштовані саме так: система властивостей WPF спроєктована так, щоб прив'язка
могла вбудуватися в неї як ще одне джерело значення.
:::

## З чого складається прив'язка

У будь-якої прив'язки є чотири складові.

**Ціль (target)** — те, що показує значення. Це **завжди властивість залежності**
(dependency property) якогось елемента інтерфейсу: `TextBlock.Text`,
`Button.IsEnabled`, `Slider.Value`, `Border.Background`. Звичайне поле класу
ціллю бути не може — саме тому у темі 22 ми так докладно розбирали, навіщо WPF
потрібні властивості залежності.

**Джерело (source)** — звичайний об'єкт .NET, у якого беруть значення. Тут
жодних спецвимог: будь-який ваш клас, рядок, число, інший елемент інтерфейсу.

**Шлях (path)** — ім'я властивості джерела, а за потреби — ланцюжок імен:
`Name`, `Author.LastName`, `Items[0].Price`.

**Режим (mode)** — напрямок, у якому передаються значення.

```
        ДЖЕРЕЛО                        ЦІЛЬ
   (звичайний об'єкт)            (елемент інтерфейсу)

   ┌─────────────────┐           ┌────────────────────┐
   │  Product        │           │  TextBox           │
   │                 │           │                    │
   │  Name  = "Кава" │           │  Text = "Кава"     │
   │  Price = 45.0   │           │                    │
   └────────┬────────┘           └─────────┬──────────┘
            │                              │
            │     ┌──────────────────┐     │
            └────▶│ BindingExpression│◀────┘
                  │                  │
                  │ Path   = Name    │
                  │ Mode   = TwoWay  │
                  └──────────────────┘
                    об'єкт-посередник,
                    який WPF створює сам
```

Посередника звуть **`BindingExpression`**. Коли ви пишете у XAML
`Text="{Binding Name}"`, WPF не підставляє туди значення один раз — він
створює живий об'єкт, який тримає посилання на джерело, знає шлях і підписаний
на сповіщення про зміни. Саме тому прив'язка «працює далі», а не лише на старті.

## Найпростіший приклад: жодного рядка C#

Почнімо з випадку, де джерелом є не наш клас, а **інший елемент інтерфейсу**.
Повзунок задає розмір шрифту, а підпис одразу показує число і змінює розмір.

```xml
<Window x:Class="BindingBasics.MainWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Прив'язка елемента до елемента" Height="220" Width="420">
    <StackPanel Margin="20">

        <Slider x:Name="SizeSlider"
                Minimum="8" Maximum="48" Value="16"
                TickFrequency="4" TickPlacement="BottomRight"/>

        <TextBlock Text="{Binding ElementName=SizeSlider, Path=Value, StringFormat=Розмір: {0:F0} пт}"
                   Margin="0,10,0,0"/>

        <TextBlock Text="Привіт, прив'язко!"
                   FontSize="{Binding ElementName=SizeSlider, Path=Value}"
                   Margin="0,10,0,0"/>

    </StackPanel>
</Window>
```

Code-behind у цьому вікні — лише `InitializeComponent()`, і більше нічого:

```csharp
using System.Windows;

namespace BindingBasics;

public partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();
    }
}
```

Тягнете повзунок — число і розмір тексту змінюються миттєво. Жодного обробника
`ValueChanged`, жодного присвоєння. Порівняйте це з тим, скільки коду
знадобилося б у темі 23.

Запам'ятайте цю вправу: якщо у вашому code-behind з'явився обробник, який
бере значення з одного елемента і кладе в інший — майже напевно це має бути
прив'язка.

## DataContext: звідки береться джерело

У прикладі вище джерело вказано явно (`ElementName=SizeSlider`). Але у 90%
випадків джерело — це один спільний об'єкт з даними на все вікно. Писати
`Source=...` у кожній прив'язці було б катуванням.

Тому у WPF є властивість **`DataContext`** — «контекст даних» елемента.
Це об'єкт, який елемент пропонує своїм прив'язкам як джерело за замовчуванням.
Найважливіше: **`DataContext` успадковується вниз по дереву елементів**.
Задали його один раз на вікні — його бачать усі нащадки.

Коли WPF зустрічає прив'язку без `Source` та без `ElementName`, він шукає
джерело так:

```
   Window            DataContext = product   ◀── знайшли, пошук завершено
      │                    ▲
      ▼                    │
   Grid              DataContext не задано  ──┘
      │                    ▲
      ▼                    │
  StackPanel         DataContext не задано  ──┘
      │                    ▲
      ▼                    │
   TextBlock  Text="{Binding Name}"  ─────────┘
                     починаємо пошук тут і йдемо вгору
```

Якщо жоден предок не має `DataContext`, джерела немає — прив'язка мовчки нічого
не показує, а у вікні Output з'явиться попередження (про нього — наприкінці).

Найтиповіше місце, де встановлюють контекст, — конструктор вікна:

```csharp
using System.Windows;

namespace BindingBasics;

public class Product
{
    public string Name { get; set; } = "";
    public decimal Price { get; set; }
    public int Quantity { get; set; }
}

public partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();

        // Один рядок — і все вікно знає, з чим працює
        DataContext = new Product
        {
            Name = "Кава мелена",
            Price = 249.50m,
            Quantity = 3
        };
    }
}
```

```xml
<Window x:Class="BindingBasics.MainWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Картка товару" Height="220" Width="380">
    <StackPanel Margin="16">
        <TextBlock Text="{Binding Name}" FontSize="20" FontWeight="Bold"/>
        <TextBlock Text="{Binding Price, StringFormat=Ціна: {0:C}}"/>
        <TextBlock Text="{Binding Quantity, StringFormat=На складі: {0} шт}"/>
    </StackPanel>
</Window>
```

**Вивід:**

```
Кава мелена
Ціна: 249,50 ₴
На складі: 3 шт
```

:::tip Порада
`DataContext` можна задавати не лише на вікні. Дуже зручно задати його на панелі,
яка відповідає за одну ділянку екрана: наприклад, `GroupBox` з даними клієнта
отримує `DataContext="{Binding SelectedCustomer}"`, і всі прив'язки всередині
пишуться коротко — `{Binding FirstName}`, `{Binding Phone}`.
:::

## Синтаксис прив'язки

`Binding` — це **розширення розмітки (markup extension)**, тому у XAML воно
пишеться у фігурних дужках. Повний і скорочений записи еквівалентні:

```xml
<!-- повний запис -->
<TextBlock Text="{Binding Path=Name}"/>

<!-- скорочення: перший параметр без імені і є Path -->
<TextBlock Text="{Binding Name}"/>

<!-- прив'язка до самого джерела, без властивості -->
<TextBlock Text="{Binding}"/>
```

Шлях може бути складеним:

```xml
<TextBlock Text="{Binding Order.Customer.LastName}"/>
<TextBlock Text="{Binding Items[0].Title}"/>
```

### Чотири способи вказати джерело

| Спосіб | Запис | Коли використовувати |
|---|---|---|
| `DataContext` (за замовчуванням) | `{Binding Name}` | майже завжди: дані вікна чи ділянки екрана |
| `ElementName` | `{Binding ElementName=SizeSlider, Path=Value}` | джерело — інший елемент **цього ж** вікна |
| `RelativeSource` | `{Binding RelativeSource={RelativeSource Self}, Path=Width}` | джерело — сам елемент або його предок |
| `Source` | `{Binding Source={StaticResource AppSettings}, Path=Theme}` | джерело — об'єкт із ресурсів |

`RelativeSource` має два практично корисні режими.

**`Self`** — джерело є той самий елемент. Класика: показати власну ширину
або зробити квадрат, у якого висота дорівнює ширині.

```xml
<Border Background="LightSteelBlue"
        Width="120"
        Height="{Binding RelativeSource={RelativeSource Self}, Path=Width}">
    <TextBlock Text="{Binding RelativeSource={RelativeSource Self},
                              Path=Parent.ActualWidth,
                              StringFormat=Ширина: {0:F0}}"
               HorizontalAlignment="Center"
               VerticalAlignment="Center"/>
</Border>
```

**`FindAncestor`** — піднятися по дереву до предка вказаного типу. Це рятує
всередині шаблонів даних, де локальний `DataContext` — окремий елемент списку,
а команда лежить у контексті всього вікна:

```xml
<Button Content="Видалити"
        Command="{Binding RelativeSource={RelativeSource AncestorType=Window},
                          Path=DataContext.DeleteCommand}"
        CommandParameter="{Binding}"/>
```

Читається так: «піднімись до найближчого предка типу `Window`, візьми його
`DataContext`, а в ньому — властивість `DeleteCommand`». Ця конструкція здається
громіздкою, але у темі про списки ви будете писати її регулярно, тому варто
розібрати її зараз по шматочках.

:::warning Обережно
`ElementName` шукає елемент у тому самому **іменному діапазоні XAML**. Усередині
`DataTemplate` або `ControlTemplate` діапазон свій, і `ElementName` з іменем
з головного вікна там не знайдеться. Саме для таких випадків і потрібен
`RelativeSource AncestorType`.
:::

## Режими прив'язки

Режим задає, у який бік ходять дані. Значень чотири.

| Режим | Напрямок | Коли значення оновлюється | Типове застосування |
|---|---|---|---|
| `OneWay` | джерело ➜ ціль | щоразу, коли змінилось джерело | підписи, індикатори, списки |
| `TwoWay` | джерело ⇄ ціль | в обидва боки | поля введення, прапорці, повзунки |
| `OneTime` | джерело ➜ ціль | **один раз**, при створенні | константи, дані, що не змінюються |
| `OneWayToSource` | ціль ➜ джерело | коли змінилась ціль | рідко: ціль не має чого показувати, але має що віддати |

Записується явно:

```xml
<TextBox Text="{Binding Name, Mode=TwoWay}"/>
<TextBlock Text="{Binding Name, Mode=OneWay}"/>
<TextBlock Text="{Binding Name, Mode=OneTime}"/>
```

Але майже завжди режим писати не треба — у WPF **кожна властивість залежності
має свій режим за замовчуванням**, і він підібраний розумно:

| Властивість | Режим за замовчуванням | Чому саме такий |
|---|---|---|
| `TextBox.Text` | `TwoWay` | користувач редагує — зміна має повернутися в дані |
| `CheckBox.IsChecked` | `TwoWay` | те саме: керує користувач |
| `Slider.Value` | `TwoWay` | те саме |
| `ComboBox.SelectedItem` | `TwoWay` | вибір робить користувач |
| `TextBlock.Text` | `OneWay` | підпис лише показує, редагувати його неможливо |
| `Button.IsEnabled` | `OneWay` | стан задає програма, не користувач |
| `ItemsControl.ItemsSource` | `OneWay` | список даних елемент не переписує |

Правило просте: **якщо властивість створена для введення користувачем —
режим двосторонній, інакше односторонній**.

`OneTime` варто застосовувати свідомо: це економія пам'яті й процесора, бо WPF
не створює підписку на зміни. Для сотні незмінних підписів у довгому списку
різниця відчутна.

`OneWayToSource` — найрідкісніший. Він потрібен, коли ціль уміє повідомити щось
про себе, але показувати їй нічого. Наприклад, записати фактичну ширину панелі
у ваш об'єкт налаштувань:

```xml
<Grid x:Name="ContentGrid"
      Tag="{Binding PanelWidth, Mode=OneWayToSource}"/>
```

## UpdateSourceTrigger: коли саме дані летять назад

Для `TwoWay` і `OneWayToSource` виникає питання: у який момент нове значення
з поля потрапляє в об'єкт? Після кожної натиснутої клавіші чи коли користувач
перейде до іншого поля?

Це вирішує **`UpdateSourceTrigger`**.

| Значення | Коли джерело оновлюється |
|---|---|
| `LostFocus` | коли елемент втратив фокус (за замовчуванням для `TextBox.Text`) |
| `PropertyChanged` | негайно після кожної зміни цілі |
| `Explicit` | лише коли ви викличете `UpdateSource()` у коді |
| `Default` | те, що визначено для конкретної властивості |

Ось робочий приклад, де різниця видно неозброєним оком:

```xml
<Window x:Class="BindingBasics.TriggerWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="UpdateSourceTrigger" Height="240" Width="460">
    <StackPanel Margin="16">

        <TextBlock Text="Введіть текст у кожне поле і подивіться на дзеркало праворуч:"
                   TextWrapping="Wrap" Margin="0,0,0,10"/>

        <DockPanel Margin="0,4">
            <TextBlock DockPanel.Dock="Right" Width="150"
                       Text="{Binding ElementName=LostFocusBox, Path=Text}"
                       Background="WhiteSmoke" Padding="4"/>
            <TextBox x:Name="LostFocusBox" Padding="4"/>
        </DockPanel>
        <TextBlock Text="згори: LostFocus — оновиться, коли перейдете Tab'ом далі"
                   FontSize="11" Foreground="Gray"/>

        <DockPanel Margin="0,12,0,4">
            <TextBlock DockPanel.Dock="Right" Width="150"
                       Text="{Binding ElementName=LiveBox, Path=Text}"
                       Background="WhiteSmoke" Padding="4"/>
            <TextBox x:Name="LiveBox" Padding="4"
                     Text="{Binding Name, UpdateSourceTrigger=PropertyChanged}"/>
        </DockPanel>
        <TextBlock Text="згори: PropertyChanged — оновлюється на кожну літеру"
                   FontSize="11" Foreground="Gray"/>

    </StackPanel>
</Window>
```

Верхнє «дзеркало» стоїть на місці, поки ви друкуєте, і оживає лише після Tab.
Нижнє йде за вами літера в літеру.

:::tip Порада
Для полів пошуку й фільтрів ставте `UpdateSourceTrigger=PropertyChanged` —
користувач очікує, що список фільтрується під час набору. Для полів, які
проходять валідацію (вік, сума, дата), залишайте `LostFocus`: інакше червона
рамка «помилка» блиматиме вже після першої введеної цифри.
:::

## Три властивості, які рятують від порожнього екрана

**`FallbackValue`** — що показати, якщо прив'язка не спрацювала взагалі
(джерела немає, шлях хибний).

**`TargetNullValue`** — що показати, якщо джерело повернуло `null`.

**`StringFormat`** — як відформатувати значення у текст, без жодного конвертера.

```xml
<StackPanel Margin="16">
    <TextBlock Text="{Binding Nickname, TargetNullValue=Без імені,
                              FallbackValue=(немає даних)}"/>

    <TextBlock Text="{Binding Price, StringFormat={}{0:C}}"/>
    <TextBlock Text="{Binding Price, StringFormat=Разом: {0:N2} грн}"/>
    <TextBlock Text="{Binding CreatedAt, StringFormat=Створено {0:dd.MM.yyyy HH:mm}}"/>
    <TextBlock Text="{Binding Progress, StringFormat={}{0:P0}}"/>
</StackPanel>
```

Зверніть увагу на дивний `{}` на початку деяких форматів. Це **екранування**:
рядок формату сам починається з фігурної дужки, а XAML вирішив би, що почалося
нове розширення розмітки. Порожня пара дужок каже парсеру: «далі звичайний текст».
Якщо перед дужкою є хоч якийсь текст (`Разом: {0:N2}`), екранування не потрібне.

:::danger Часта помилка
`StringFormat` працює тільки тоді, коли цільова властивість має тип `string`.
У `TextBlock.Text` — працює. У `Button.Content` (тип `object`) — мовчки
ігнорується, бо форматувати в рядок не обов'язково. Для `Content` ставте
всередину `TextBlock` з прив'язкою.
:::

## Як шукати помилки прив'язки

Найважча риса прив'язок для початківця: **вони не кидають винятків**. Помилились
у назві властивості — програма працює, елемент просто порожній. Годину дивитеся
на екран і не розумієте, чому нічого немає.

Насправді WPF чесно про все пише — у вікно **Output** Visual Studio
(меню View ➜ Output, або Ctrl+Alt+O), у режимі налагодження (F5, не Ctrl+F5).
Розберімо типове повідомлення.

```
System.Windows.Data Error: 40 : BindingExpression path error:
'Titl' property not found on 'object' ''Product' (HashCode=45653674)'.
BindingExpression:Path=Titl; DataItem='Product' (HashCode=45653674);
target element is 'TextBlock' (Name='TitleText');
target property is 'Text' (type 'String')
```

Читаємо по рядках:

| Фрагмент | Що каже |
|---|---|
| `System.Windows.Data Error: 40` | помилка прив'язки, код 40 — «не знайдено властивість за шляхом» |
| `'Titl' property not found` | у джерелі немає властивості з таким іменем — тут просто друкарська помилка |
| `on 'object' ''Product'` | джерело знайдено, і це об'єкт типу `Product` — отже, `DataContext` встановлено правильно |
| `Path=Titl` | шлях, який ви написали у XAML |
| `target element is 'TextBlock' (Name='TitleText')` | **де саме** у вікні шукати проблему |
| `target property is 'Text'` | яку властивість намагались заповнити |

Висновок: `DataContext` нормальний, а у XAML треба виправити `Titl` на `Title`.

Друге за частотою повідомлення виглядає інакше:

```
System.Windows.Data Error: 4 : Cannot find source for binding with reference
'ElementName=SizeSlidr'. BindingExpression:Path=Value;
DataItem=null; target element is 'TextBlock' (Name='');
target property is 'FontSize' (type 'Double')
```

Тут ключове — `Cannot find source` і `DataItem=null`: джерела немає взагалі.
Причина — або помилка в `ElementName`, або `DataContext` ніхто не встановив,
або ви встановили його **після** того, як вікно вже спробувало намалюватись
із порожнім контекстом (це не помилка, таке повідомлення зникає після
встановлення).

:::tip Порада
Привчіться перед кожним запуском очищати вікно Output (права кнопка ➜ Clear All),
а після запуску шукати в ньому рядок `System.Windows.Data Error`. Це п'ять секунд,
які регулярно економлять пів години. У великому проєкті зручно звузити вивід:
Tools ➜ Options ➜ Debugging ➜ Output Window ➜ Data Binding, і виставити рівень
`Warning` або `Error`.
:::

## Що ми вміємо і чого бракує

На цей момент ви можете прив'язати елемент до елемента й елемент до звичайного
об'єкта. Але спробуйте у прикладі з товаром додати кнопку, яка змінює ціну:

```csharp
private void RaisePriceButton_Click(object sender, RoutedEventArgs e)
{
    var product = (Product)DataContext;
    product.Price += 10;          // значення змінилось...
}
```

Натисніть кнопку кілька разів. У налагоджувачі `product.Price` росте,
а на екрані так само стоїть `249,50 ₴`. Прив'язка спрацювала рівно один раз —
при створенні — і більше нічого не знає.

Чому так і як це виправити — у наступному підрозділі.

## Типові помилки

- **Прив'язка є, а `DataContext` не встановлено.** Найчастіша причина порожнього
  екрана. Перевіряйте вікно Output: `DataItem=null` — це саме воно.
- **Друкарська помилка у `Path`.** WPF не підкаже під час компіляції: імена
  властивостей у XAML — це звичайні рядки. Копіюйте назву з класу, не набирайте руками.
- **Спроба прив'язати до поля, а не до властивості.** `public string Name;` не
  працює, потрібне `public string Name { get; set; }`. Прив'язка читає джерело
  через рефлексію по властивостях.
- **`StringFormat` у `Button.Content` чи `ContentControl.Content`.** Мовчки
  не спрацює: формат застосовується лише до рядкових цілей.
- **Обробник події, який копіює значення з одного елемента в інший.** Такий код
  майже завжди замінюється однією прив'язкою з `ElementName`.
