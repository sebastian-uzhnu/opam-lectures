---
sidebar_position: 4
---

# Передача даних між формами

У багатовіконних (і особливо в діалогових) додатках найчастішою задачею є комунікація між вікнами. Наприклад: Головна форма відкриває Діалог Налаштувань. Як Головна форма отримає введені користувачем налаштування? Або як Головна форма передасть у Діалог існуючі налаштування перед відкриттям?

Існує декілька правильних способів організації такої передачі даних у C#. Ми розглянемо надійні та безпечні підходи (уникаючи використання глобальних статичних змінних, що вважається поганою практикою).

## Спосіб 1: Передача даних через конструктор (Від Головної -> до Дочірньої)

Цей спосіб ідеальний, коли батьківській формі потрібно разово передати початкові дані у дочірню при її створенні.

Вам потрібно змінити конструктор дочірньої форми так, щоб він приймав параметри.

**У дочірній формі (`EditUserForm.cs`):**

```csharp
public partial class EditUserForm : Form
{
    // Змінений конструктор
    public EditUserForm(string currentUserName)
    {
        InitializeComponent();

        // Використовуємо передані дані
        txtName.Text = currentUserName;
    }
}
```

**У головній формі (виклик):**

```csharp
private void btnEdit_Click(object sender, EventArgs e)
{
    // Передаємо дані прямо під час створення об'єкта
    EditUserForm editForm = new EditUserForm("Іван Іванов");
    editForm.ShowDialog();
}
```

## Спосіб 2: Передача даних через публічні властивості (В обидві сторони)

Це найбільш класичний і потужний метод для роботи з діалоговими вікнами. Ви створюєте публічні властивості (`public property`) у дочірній формі. Батьківська форма може читати та записувати ці властивості.

**У дочірній формі (`SettingsForm.cs`):**

```csharp
public partial class SettingsForm : Form
{
    public SettingsForm()
    {
        InitializeComponent();
    }

    // Властивість для передачі/отримання імені
    public string ConfigName
    {
        get { return txtConfigName.Text; } // Читання з TextBox
        set { txtConfigName.Text = value; } // Запис у TextBox
    }

    // Властивість для передачі/отримання якоїсь опції (Check box)
    public bool EnableDarkTheme
    {
        get { return chkDarkTheme.Checked; }
        set { chkDarkTheme.Checked = value; }
    }
}
```

**У головній формі (виклик і отримання результату):**

```csharp
private void btnOpenSettings_Click(object sender, EventArgs e)
{
    using (SettingsForm form = new SettingsForm())
    {
        // 1. Передаємо поточні дані У дочірню форму
        form.ConfigName = "Стандартний профіль";
        form.EnableDarkTheme = false;

        // 2. Показуємо діалог
        if (form.ShowDialog() == DialogResult.OK)
        {
            // 3. Якщо ОК, читаємо змінені дані З дочірньої форми
            string newConfig = form.ConfigName;
            bool isDark = form.EnableDarkTheme;

            // Застосовуємо отримані зміни до головної форми...
            ApplySettings(newConfig, isDark);
        }
    }
}
```

## Спосіб 3: Використання подій (Від Дочірньої -> до Головної)

Цей підхід ідеальний для **немодальних** вікон (`Show()`), коли дочірня форма може бути відкритою постійно, і вона має інформувати батьківську форму про якісь події в режимі реального часу (наприклад, вікно-панель інструментів змінює колір пензля, і головна форма повинна негайно це помітити).

Ви створюєте подію (`event`) у дочірній формі, а головна форма на неї "підписується".

**У дочірній (плаваючій) формі (`ToolPaletteForm.cs`):**

```csharp
public partial class ToolPaletteForm : Form
{
    // Оголошуємо власну подію (за допомогою стандартного делегата Action)
    public event Action<Color> ColorChanged;

    public ToolPaletteForm()
    {
        InitializeComponent();
    }

    private void btnRed_Click(object sender, EventArgs e)
    {
        // Викидаємо подію, передаючи новий колір
        // Символ ?. гарантує, що подія викличеться лише якщо на неї хтось підписаний
        ColorChanged?.Invoke(Color.Red);
    }
}
```

**У головній формі:**

```csharp
private void btnShowPalette_Click(object sender, EventArgs e)
{
    ToolPaletteForm palette = new ToolPaletteForm();

    // Підписуємося на подію дочірньої форми
    palette.ColorChanged += Palette_ColorChanged;

    palette.Show(); // Палітра плаває поруч
}

// Обробник, який буде спрацьовувати щоразу, коли у палітрі натискають кнопку
private void Palette_ColorChanged(Color newColor)
{
    // Змінюємо колір фону головної форми на отриманий!
    this.BackColor = newColor;
}
```

Опанувавши вищенаведені три способи взаємодії, ви зможете будувати гнучкі та архітектурно правильні застосунки з будь-якою кількістю і складністю вікон.
