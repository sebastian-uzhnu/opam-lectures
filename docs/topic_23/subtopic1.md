---
sidebar_position: 2
---

# Власні діалоги та передача даних між вікнами

## Коли стандартних діалогів не вистачає

`MessageBox` уміє показати текст і зібрати відповідь «Так/Ні». `OpenFileDialog`
уміє вибрати файл. А якщо треба запитати в користувача ім'я, телефон і дату
народження — одразу, в одному вікні, з перевіркою введеного?

Тоді ви робите **власний діалог**: звичайне вікно `Window`, оформлене й
налаштоване так, щоб поводитись як діалог. Ніякого окремого класу для цього
у WPF немає — «діалоговість» вікна складається з трьох речей:

1. його показують через `ShowDialog()`, а не `Show()`;
2. у нього є кнопки підтвердження та скасування, які встановлюють `DialogResult`;
3. воно налаштоване так, щоб виглядати як діалог (фіксований розмір, по центру
   власника, без значка на панелі задач).

## Додаємо вікно у проєкт

У Visual Studio 2022 це три кліки:

```
Solution Explorer
   └── правою кнопкою на проєкті
         └── Add ▸ Window...      ◀── саме Window, не User Control і не Page
               └── ім'я: AddContactWindow.xaml
```

Visual Studio створить пару файлів:

```
AddContactWindow.xaml       ← розмітка вікна
   └── AddContactWindow.xaml.cs   ← code-behind, клас partial
```

Клас усередині виглядає точнісінько як `MainWindow`:

```csharp
public partial class AddContactWindow : Window
{
    public AddContactWindow()
    {
        InitializeComponent();
    }
}
```

:::warning[Обережно]
У списку Add є дуже схожі пункти: `Window (WPF)`, `Page (WPF)` і
`User Control (WPF)`. Для діалогу потрібне саме **Window** — тільки воно
має методи `Show`/`ShowDialog`. `Page` знадобиться нам у підрозділі
про навігацію, `UserControl` — це шматок інтерфейсу всередині вікна.
:::

## Оформлення діалогу

Ось типовий діалог «Додати контакт». Розберемо його по частинах.

```xml
<Window x:Class="ContactsApp.AddContactWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Новий контакт"
        SizeToContent="Height" Width="360"
        ResizeMode="NoResize"
        WindowStartupLocation="CenterOwner"
        ShowInTaskbar="False">

    <StackPanel Margin="16">

        <TextBlock Text="Ім'я:" />
        <TextBox x:Name="NameBox" Margin="0,4,0,10" />

        <TextBlock Text="Телефон:" />
        <TextBox x:Name="PhoneBox" Margin="0,4,0,10" />

        <TextBlock x:Name="ErrorText"
                   Foreground="Firebrick"
                   TextWrapping="Wrap"
                   Margin="0,0,0,10" />

        <StackPanel Orientation="Horizontal" HorizontalAlignment="Right">
            <Button Content="Гаразд" Width="90"
                    IsDefault="True" Click="OkButton_Click" />
            <Button Content="Скасувати" Width="90" Margin="8,0,0,0"
                    IsCancel="True" />
        </StackPanel>

    </StackPanel>
</Window>
```

### IsDefault та IsCancel

Дві властивості кнопки, які варті цілого абзацу.

**`IsDefault="True"`** робить кнопку кнопкою за замовчуванням: натискання
клавіші **Enter** будь-де у вікні спрацьовує як клік по ній. Це та сама
кнопка, яку у Windows малюють підсвіченою.

**`IsCancel="True"`** робить кнопку кнопкою скасування: клавіша **Esc**
спрацьовує як клік по ній. І — найважливіше — WPF для такої кнопки
**сам** встановлює `DialogResult = false` і закриває вікно. Обробник
`Click` для кнопки «Скасувати» писати не треба взагалі.

```
   Клавіатура користувача          Що робить WPF
   ─────────────────────           ─────────────────────────────────
        Enter          ─────────▶  Click на кнопці з IsDefault="True"
        Esc            ─────────▶  Click на кнопці з IsCancel="True"
                                   + DialogResult = false
                                   + вікно закривається
```

:::tip[Порада]
Будь-який діалог має бути прохідним з клавіатури: Tab між полями, Enter —
підтвердити, Esc — скасувати. Дві властивості в XAML, а користувачі,
які не люблять мишу, будуть вам вдячні.
:::

### Що робить `DialogResult = true`

Для кнопки «Гаразд» автоматики немає — і це правильно, бо перед підтвердженням
зазвичай треба перевірити введене. Обробник виглядає так:

```csharp
private void OkButton_Click(object sender, RoutedEventArgs e)
{
    // ... тут буде валідація ...

    DialogResult = true;   // це ОДНОЧАСНО:
                           //   1) задає результат для ShowDialog()
                           //   2) закриває вікно
}
```

Виклик `Close()` після цього рядка зайвий: присвоєння `DialogResult`
у модальному вікні саме закриває його.

## Спосіб 1: через конструктор (батько → дитина)

Найпростіший випадок: діалог має відкритися вже заповненим. Наприклад,
ви редагуєте існуючий контакт — поля мають одразу містити його дані.

```
  ┌───────────────────┐                     ┌──────────────────────┐
  │   MainWindow      │   new AddContact    │  AddContactWindow    │
  │                   │   Window("Оля",     │                      │
  │  selected contact │   "0671234567")     │  NameBox.Text = ...  │
  │        ●──────────┼────────────────────▶│  PhoneBox.Text = ... │
  └───────────────────┘   дані йдуть УПЕРЕД └──────────────────────┘
```

Додаємо у дочірнє вікно ще один конструктор:

```csharp
public partial class AddContactWindow : Window
{
    // Конструктор для створення нового контакту
    public AddContactWindow()
    {
        InitializeComponent();
    }

    // Конструктор для редагування наявного
    public AddContactWindow(string name, string phone) : this()
    {
        // : this() викликає перший конструктор,
        // тому InitializeComponent() тут повторювати НЕ треба
        Title = "Редагувати контакт";
        NameBox.Text = name;
        PhoneBox.Text = phone;
    }
}
```

Виклик із батьківського вікна:

```csharp
var dlg = new AddContactWindow("Оля Кравець", "0671234567");
dlg.Owner = this;
dlg.ShowDialog();
```

:::info[Цікаво]
Конструкція `public AddContactWindow(string name, string phone) : this()`
називається **ланцюжком конструкторів**. Запис `: this()` означає
«спочатку виконай конструктор без параметрів, потім моє тіло».
Так не доводиться дублювати `InitializeComponent()`.
:::

## Спосіб 2: через публічні властивості (дитина → батько)

А тепер зворотний напрямок — найчастіший. Діалог закрився, і головному
вікну треба забрати те, що ввів користувач.

Хитрість у тому, що **закрите вікно не зникає**. Метод `ShowDialog()`
прибирає вікно з екрана, але об'єкт лишається в пам'яті, доки на нього
є посилання — ваша змінна `dlg`. Тож його властивості можна спокійно читати
після закриття.

```
  ┌───────────────────┐                      ┌──────────────────────┐
  │   MainWindow      │                      │  AddContactWindow    │
  │                   │   dlg.ShowDialog()   │                      │
  │                   ├─────────────────────▶│  користувач вводить  │
  │                   │                      │  DialogResult = true │
  │  var c =          │◀─────────────────────┤  вікно закрилось,    │
  │   dlg.CreatedItem;│   дані йдуть НАЗАД   │  об'єкт живий        │
  └───────────────────┘                      └──────────────────────┘
```

Оголошуємо у дочірньому вікні публічну властивість:

```csharp
public partial class AddContactWindow : Window
{
    // Результат роботи діалогу. null, доки користувач не підтвердив.
    public Contact? CreatedContact { get; private set; }

    public AddContactWindow()
    {
        InitializeComponent();
    }

    private void OkButton_Click(object sender, RoutedEventArgs e)
    {
        CreatedContact = new Contact(NameBox.Text, PhoneBox.Text);
        DialogResult = true;
    }
}
```

`private set` тут не випадковий: заповнювати властивість має право лише
саме вікно, а батько тільки читає.

Батьківське вікно:

```csharp
var dlg = new AddContactWindow { Owner = this };

if (dlg.ShowDialog() == true && dlg.CreatedContact is not null)
{
    ContactsList.Items.Add(dlg.CreatedContact);
}
```

:::danger[Часта помилка]
Читати `dlg.CreatedContact` після `dlg.Show()` — безглуздо. `Show()` не
чекає: наступний рядок виконається, коли користувач ще навіть не встиг
клацнути в поле. Властивість буде `null`, і студент півгодини шукає,
«чому не працює». Для читання результату потрібен саме `ShowDialog()`.
:::

## Спосіб 3: через подію (немодальне вікно, у реальному часі)

Є випадки, коли чекати закриття не можна. Класика — вікно «Пошук і заміна»
у текстовому редакторі: воно висить збоку, а кожне натискання «Знайти далі»
має негайно вплинути на головне вікно.

Тут дочірнє вікно оголошує **подію**, а батьківське на неї підписується.
Дитина не знає нічого про батька — вона просто кричить у порожнечу
«знайдено таке слово», а хто слухає, той і реагує.

```
  ┌───────────────────┐                      ┌───────────────────────┐
  │   MainWindow      │   search.Show()      │   SearchWindow        │
  │                   ├─────────────────────▶│                       │
  │  підписка:        │                      │  користувач натиснув  │
  │  search.SearchReq │                      │  «Знайти далі»        │
  │    += OnSearch;   │◀ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤  SearchRequested?.    │
  │                   │   подія, БАГАТО разів│     Invoke(this, text)│
  │  обидва вікна     │   поки вікно живе    │                       │
  │  працюють разом   │                      │                       │
  └───────────────────┘                      └───────────────────────┘
```

Дочірнє вікно:

```xml
<Window x:Class="ContactsApp.SearchWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Пошук" SizeToContent="Height" Width="280"
        ResizeMode="NoResize" ShowInTaskbar="False"
        WindowStartupLocation="CenterOwner">
    <StackPanel Margin="12">
        <TextBox x:Name="QueryBox" Margin="0,0,0,8" />
        <Button Content="Знайти далі" Click="FindButton_Click" />
    </StackPanel>
</Window>
```

```csharp
using System.Windows;

namespace ContactsApp;

public partial class SearchWindow : Window
{
    // Подія: «користувач попросив знайти ось цей рядок»
    public event EventHandler<string>? SearchRequested;

    public SearchWindow()
    {
        InitializeComponent();
    }

    private void FindButton_Click(object sender, RoutedEventArgs e)
    {
        var query = QueryBox.Text.Trim();
        if (query.Length == 0)
            return;

        // ?. потрібен на випадок, якщо ніхто не підписався
        SearchRequested?.Invoke(this, query);
    }
}
```

Батьківське вікно підписується один раз і живе далі:

```csharp
private SearchWindow? searchWindow;

private void ShowSearch_Click(object sender, RoutedEventArgs e)
{
    // Не відкриваємо друге таке саме вікно
    if (searchWindow is not null)
    {
        searchWindow.Activate();   // просто виносимо наперед
        return;
    }

    searchWindow = new SearchWindow { Owner = this };
    searchWindow.SearchRequested += OnSearchRequested;
    searchWindow.Closed += (s, args) => searchWindow = null;
    searchWindow.Show();           // НЕмодально
}

private void OnSearchRequested(object? sender, string query)
{
    // Реагуємо негайно, вікно пошуку лишається відкритим
    StatusText.Text = $"Шукаємо: {query}";
}
```

:::tip[Порада]
Зверніть увагу на `searchWindow.Closed += (s, args) => searchWindow = null;`.
Без цього рядка після закриття вікна змінна й далі вказує на мертвий об'єкт,
а повторний `Show()` на закритому вікні кидає `InvalidOperationException`:
закрите вікно у WPF повторно відкрити не можна.
:::

## Який спосіб коли

| Спосіб | Напрямок | Коли | Коли не |
| --- | --- | --- | --- |
| Конструктор | батько → дитина | треба передати початкові дані у діалог | якщо параметрів більше 3-4 — краще передати один об'єкт |
| Публічні властивості | дитина → батько | модальний діалог, результат читаємо після закриття | якщо вікно немодальне — властивість ще порожня |
| Подія | дитина → батько | немодальне вікно, реакція потрібна одразу й багато разів | для звичайного «Гаразд/Скасувати» це надмірно |

Перші два способи майже завжди йдуть у парі: дані передали конструктором,
результат забрали з властивості.

## Наскрізний приклад: список контактів

Збираємо все докупи. Головне вікно зі списком, кнопка «Додати», діалог
із валідацією, повернення нового запису.

### Модель даних

Звичайний клас із перевизначеним `ToString()` — щоб `ListBox` знав,
що показувати (прив'язки даних ми ще не вчили, тому `ToString` — наш
тимчасовий помічник).

```csharp
namespace ContactsApp;

public class Contact
{
    public string Name { get; }
    public string Phone { get; }

    public Contact(string name, string phone)
    {
        Name = name;
        Phone = phone;
    }

    public override string ToString() => $"{Name} — {Phone}";
}
```

### Головне вікно

```xml
<Window x:Class="ContactsApp.MainWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Контакти" Height="360" Width="460"
        WindowStartupLocation="CenterScreen">
    <DockPanel Margin="10">

        <StackPanel DockPanel.Dock="Top" Orientation="Horizontal"
                    Margin="0,0,0,8">
            <Button Content="Додати..." Width="110" Click="AddButton_Click" />
            <Button Content="Редагувати..." Width="110" Margin="8,0,0,0"
                    Click="EditButton_Click" />
            <Button Content="Видалити" Width="110" Margin="8,0,0,0"
                    Click="DeleteButton_Click" />
        </StackPanel>

        <TextBlock x:Name="StatusText" DockPanel.Dock="Bottom"
                   Foreground="DimGray" Margin="2,6,0,0"
                   Text="Контактів: 0" />

        <ListBox x:Name="ContactsList" />
    </DockPanel>
</Window>
```

```csharp
using System.Windows;

namespace ContactsApp;

public partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();
    }

    private void AddButton_Click(object sender, RoutedEventArgs e)
    {
        var dlg = new AddContactWindow { Owner = this };

        if (dlg.ShowDialog() == true && dlg.CreatedContact is not null)
        {
            ContactsList.Items.Add(dlg.CreatedContact);
            UpdateStatus();
        }
    }

    private void EditButton_Click(object sender, RoutedEventArgs e)
    {
        if (ContactsList.SelectedItem is not Contact selected)
        {
            MessageBox.Show(this, "Спочатку виберіть контакт у списку.",
                            "Нічого не вибрано",
                            MessageBoxButton.OK, MessageBoxImage.Information);
            return;
        }

        // Спосіб 1: передаємо дані у діалог через конструктор
        var dlg = new AddContactWindow(selected.Name, selected.Phone)
        {
            Owner = this
        };

        // Спосіб 2: забираємо результат із публічної властивості
        if (dlg.ShowDialog() == true && dlg.CreatedContact is not null)
        {
            int index = ContactsList.SelectedIndex;
            ContactsList.Items[index] = dlg.CreatedContact;
        }
    }

    private void DeleteButton_Click(object sender, RoutedEventArgs e)
    {
        if (ContactsList.SelectedItem is not Contact selected)
            return;

        var answer = MessageBox.Show(this,
            $"Видалити контакт «{selected.Name}»?",
            "Підтвердження",
            MessageBoxButton.YesNo, MessageBoxImage.Warning);

        if (answer == MessageBoxResult.Yes)
        {
            ContactsList.Items.Remove(selected);
            UpdateStatus();
        }
    }

    private void UpdateStatus()
    {
        StatusText.Text = $"Контактів: {ContactsList.Items.Count}";
    }
}
```

### Діалог із валідацією

XAML діалогу ми вже бачили вище. Ось його повний code-behind:

```csharp
using System.Windows;

namespace ContactsApp;

public partial class AddContactWindow : Window
{
    public Contact? CreatedContact { get; private set; }

    public AddContactWindow()
    {
        InitializeComponent();
    }

    public AddContactWindow(string name, string phone) : this()
    {
        Title = "Редагувати контакт";
        NameBox.Text = name;
        PhoneBox.Text = phone;
    }

    private void OkButton_Click(object sender, RoutedEventArgs e)
    {
        var name = NameBox.Text.Trim();
        var phone = PhoneBox.Text.Trim();

        // Валідація: поки дані погані — вікно НЕ закривається
        if (name.Length == 0)
        {
            ErrorText.Text = "Введіть ім'я контакту.";
            NameBox.Focus();
            return;
        }

        if (phone.Length < 7)
        {
            ErrorText.Text = "Телефон має містити щонайменше 7 символів.";
            PhoneBox.Focus();
            return;
        }

        foreach (char c in phone)
        {
            if (!char.IsDigit(c) && c != '+' && c != '-' && c != ' ')
            {
                ErrorText.Text = "У телефоні дозволені лише цифри, +, - і пробіл.";
                PhoneBox.Focus();
                return;
            }
        }

        // Усе гаразд — формуємо результат і закриваємось
        CreatedContact = new Contact(name, phone);
        DialogResult = true;
    }
}
```

Головна ідея валідації в діалозі: **поки дані неправильні, `DialogResult`
не встановлюється, отже вікно не закривається**. Користувач бачить
повідомлення про помилку й лишається у діалозі, а не втрачає введене.

Вигляд обох вікон:

```
┌─ Контакти ────────────────────── ─ □ ✕ ┐
│ [Додати...][Редагувати...][Видалити]   │
│ ┌────────────────────────────────────┐ │
│ │ Оля Кравець — 067 123 45 67        │ │      ┌─ Новий контакт ───────┐
│ │ Тарас Бойко — 050 987 65 43        │ │      │ Ім'я:                 │
│ │ ▸ Ніна Гончар — 063 111 22 33      │ │      │ [Ніна Гончар       ]  │
│ └────────────────────────────────────┘ │      │ Телефон:              │
│ Контактів: 3                           │      │ [063 111 22 33     ]  │
└────────────────────────────────────────┘      │                       │
                                                │      [Гаразд][Скасув.]│
                                                └───────────────────────┘
```

## Типові помилки

1. **Читати результат після `Show()`.** Властивість дочірнього вікна ще
   порожня — код не чекав. Використовуйте `ShowDialog()`, або подію.

2. **`Close()` після `DialogResult = true`.** Зайвий рядок: присвоєння
   `DialogResult` уже закрило вікно. Гірше того, після закриття виклик
   `Close()` на тому самому вікні може призвести до помилки.

3. **Обробник `Click` для кнопки «Скасувати».** Якщо в кнопки є
   `IsCancel="True"`, WPF сам поставить `DialogResult = false` і закриє
   вікно. Свій обробник тут зайвий.

4. **Закривати вікно при невалідних даних.** Якщо валідація не пройшла —
   не чіпайте `DialogResult` і зробіть `return`. Інакше користувач втрачає
   введене й мусить починати спочатку.

5. **Повторний `Show()` на закритому вікні.** У WPF закрите вікно
   «одноразове»: спроба показати його знову кидає виняток. Створюйте
   новий об'єкт щоразу.
