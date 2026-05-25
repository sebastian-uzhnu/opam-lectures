---
sidebar_position: 4
---

# Практичний WPF-додаток: менеджер нотаток

## Опис проекту

Створимо WPF-додаток **«Нотатки»** — простий менеджер нотаток, що:
- Зберігає нотатки у **JSON файл** (`notes.json`) при кожній зміні
- Завантажує нотатки при запуску
- Дозволяє **додавати**, **редагувати** та **видаляти** нотатки
- Показує **дату і час** створення/зміни
- Має кнопку **«Експорт у XML»** для демонстрації обох форматів

## Структура проекту

```
NotesApp/
├── Models/
│   └── Note.cs
├── Services/
│   ├── JsonNoteStorage.cs
│   └── XmlNoteExporter.cs
├── MainWindow.xaml
└── MainWindow.xaml.cs
```

## Модель даних

```csharp
// Models/Note.cs
using System.Text.Json.Serialization;

namespace NotesApp.Models
{
    public class Note
    {
        public int      Id        { get; set; }
        public string   Title     { get; set; } = string.Empty;
        public string   Content   { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? Category { get; set; }

        // Для відображення у ListBox
        public override string ToString() => $"[{Id}] {Title}";
    }
}
```

## Сервіс збереження у JSON

```csharp
// Services/JsonNoteStorage.cs
using System.Text.Json;
using NotesApp.Models;

namespace NotesApp.Services
{
    public class JsonNoteStorage
    {
        private readonly string _filePath;
        private readonly JsonSerializerOptions _options = new()
        {
            WriteIndented = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        public JsonNoteStorage(string filePath = "notes.json")
        {
            _filePath = filePath;
        }

        public List<Note> Load()
        {
            if (!File.Exists(_filePath))
                return new List<Note>();

            try
            {
                string json = File.ReadAllText(_filePath);
                return JsonSerializer.Deserialize<List<Note>>(json, _options)
                       ?? new List<Note>();
            }
            catch (JsonException)
            {
                // Файл пошкоджений — повертаємо порожній список
                return new List<Note>();
            }
        }

        public void Save(IEnumerable<Note> notes)
        {
            string json = JsonSerializer.Serialize(notes, _options);
            File.WriteAllText(_filePath, json);
        }
    }
}
```

## Сервіс експорту у XML

```csharp
// Services/XmlNoteExporter.cs
using System.Xml.Linq;
using NotesApp.Models;

namespace NotesApp.Services
{
    public class XmlNoteExporter
    {
        public void Export(IEnumerable<Note> notes, string filePath)
        {
            var doc = new XDocument(
                new XDeclaration("1.0", "utf-8", "yes"),
                new XElement("notes",
                    new XAttribute("exportedAt", DateTime.Now.ToString("o")),
                    new XAttribute("count", notes.Count()),
                    notes.Select(n =>
                        new XElement("note",
                            new XAttribute("id", n.Id),
                            new XAttribute("category", n.Category ?? "general"),
                            new XElement("title",   n.Title),
                            new XElement("content", n.Content),
                            new XElement("createdAt", n.CreatedAt.ToString("o")),
                            new XElement("updatedAt", n.UpdatedAt.ToString("o"))
                        )
                    )
                )
            );

            doc.Save(filePath);
        }
    }
}
```

## XAML інтерфейс

```xml
<Window x:Class="NotesApp.MainWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Нотатки" Height="560" Width="820"
        Background="#1e1e2e">

    <Window.Resources>
        <!-- Стиль для кнопок -->
        <Style x:Key="ActionBtn" TargetType="Button">
            <Setter Property="Background"  Value="#313244"/>
            <Setter Property="Foreground"  Value="#cdd6f4"/>
            <Setter Property="BorderThickness" Value="0"/>
            <Setter Property="Padding"     Value="12,6"/>
            <Setter Property="Margin"      Value="4,2"/>
            <Setter Property="Cursor"      Value="Hand"/>
        </Style>
    </Window.Resources>

    <Grid Margin="8">
        <Grid.ColumnDefinitions>
            <ColumnDefinition Width="220"/>
            <ColumnDefinition Width="*"/>
        </Grid.ColumnDefinitions>

        <!-- Ліва панель: список нотаток -->
        <DockPanel Grid.Column="0" Margin="0,0,8,0">
            <StackPanel DockPanel.Dock="Top">
                <TextBlock Text="Нотатки" Foreground="#cdd6f4"
                           FontSize="18" FontWeight="Bold" Margin="4,4,4,8"/>
                <Button Content="+ Нова нотатка" Style="{StaticResource ActionBtn}"
                        Background="#89b4fa" Foreground="#1e1e2e"
                        Click="OnNew_Click"/>
            </StackPanel>

            <StackPanel DockPanel.Dock="Bottom">
                <Separator Background="#313244" Margin="0,8"/>
                <Button Content="Експорт у XML"  Style="{StaticResource ActionBtn}"
                        Click="OnExportXml_Click"/>
                <TextBlock x:Name="StatusText" Foreground="#6c7086"
                           FontSize="11" Margin="4,4" TextWrapping="Wrap"/>
            </StackPanel>

            <ListBox x:Name="NotesList"
                     Background="#181825" Foreground="#cdd6f4"
                     BorderThickness="0"
                     SelectionChanged="OnNoteSelected"/>
        </DockPanel>

        <!-- Права панель: редактор нотатки -->
        <Border Grid.Column="1" Background="#181825" CornerRadius="8" Padding="16">
            <Grid>
                <Grid.RowDefinitions>
                    <RowDefinition Height="Auto"/>
                    <RowDefinition Height="Auto"/>
                    <RowDefinition Height="*"/>
                    <RowDefinition Height="Auto"/>
                    <RowDefinition Height="Auto"/>
                </Grid.RowDefinitions>

                <!-- Заголовок -->
                <TextBlock Text="Заголовок" Foreground="#6c7086"
                           Grid.Row="0" Margin="0,0,0,4"/>
                <TextBox x:Name="TitleBox"
                         Grid.Row="1"
                         Background="#313244" Foreground="#cdd6f4"
                         BorderThickness="0" Padding="8" FontSize="16"
                         Margin="0,0,0,12"
                         TextChanged="OnEditorChanged"/>

                <!-- Вміст -->
                <TextBox x:Name="ContentBox"
                         Grid.Row="2"
                         Background="#313244" Foreground="#cdd6f4"
                         BorderThickness="0" Padding="8"
                         AcceptsReturn="True" TextWrapping="Wrap"
                         VerticalScrollBarVisibility="Auto"
                         TextChanged="OnEditorChanged"/>

                <!-- Дати -->
                <TextBlock x:Name="DatesText"
                           Grid.Row="3"
                           Foreground="#6c7086" FontSize="11"
                           Margin="0,8,0,8"/>

                <!-- Кнопки дій -->
                <StackPanel Grid.Row="4" Orientation="Horizontal">
                    <Button Content="Зберегти"  Style="{StaticResource ActionBtn}"
                            Background="#a6e3a1" Foreground="#1e1e2e"
                            Click="OnSave_Click"/>
                    <Button Content="Видалити"  Style="{StaticResource ActionBtn}"
                            Background="#f38ba8" Foreground="#1e1e2e"
                            Click="OnDelete_Click"/>
                </StackPanel>
            </Grid>
        </Border>
    </Grid>
</Window>
```

## Code-behind: MainWindow.xaml.cs

```csharp
using System.Windows;
using System.Windows.Controls;
using NotesApp.Models;
using NotesApp.Services;
using Microsoft.Win32;

namespace NotesApp
{
    public partial class MainWindow : Window
    {
        private readonly JsonNoteStorage _storage  = new();
        private readonly XmlNoteExporter _exporter = new();

        private List<Note> _notes  = new();
        private Note?      _active = null;   // нотатка, що зараз редагується
        private bool       _dirty  = false;  // є незбережені зміни
        private int        _nextId = 1;

        public MainWindow()
        {
            InitializeComponent();
            LoadNotes();
        }

        // ── Завантаження / збереження ────────────────────────────────

        private void LoadNotes()
        {
            _notes = _storage.Load();
            _nextId = _notes.Count > 0 ? _notes.Max(n => n.Id) + 1 : 1;
            RefreshList();
            SetStatus($"Завантажено {_notes.Count} нотаток");
        }

        private void SaveAll()
        {
            _storage.Save(_notes);
            _dirty = false;
            SetStatus($"Збережено • {DateTime.Now:HH:mm:ss}");
        }

        // ── UI-дії ───────────────────────────────────────────────────

        private void OnNew_Click(object sender, RoutedEventArgs e)
        {
            if (_dirty && !ConfirmDiscard()) return;

            var note = new Note
            {
                Id        = _nextId++,
                Title     = "Нова нотатка",
                Content   = "",
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };

            _notes.Add(note);
            RefreshList();
            NotesList.SelectedItem = note;
        }

        private void OnNoteSelected(object sender, SelectionChangedEventArgs e)
        {
            if (NotesList.SelectedItem is Note note)
            {
                _active = note;
                _dirty  = false;

                TitleBox.Text   = note.Title;
                ContentBox.Text = note.Content;
                DatesText.Text  = $"Створено: {note.CreatedAt:dd.MM.yyyy HH:mm}   " +
                                  $"Змінено: {note.UpdatedAt:dd.MM.yyyy HH:mm}";
            }
        }

        private void OnEditorChanged(object sender, TextChangedEventArgs e)
        {
            // Ігноруємо зміни під час програмного заповнення полів
            if (_active == null) return;
            _dirty = true;
        }

        private void OnSave_Click(object sender, RoutedEventArgs e)
        {
            if (_active == null) return;

            _active.Title     = TitleBox.Text.Trim();
            _active.Content   = ContentBox.Text;
            _active.UpdatedAt = DateTime.Now;

            if (string.IsNullOrWhiteSpace(_active.Title))
                _active.Title = "Без назви";

            RefreshList();
            SaveAll();

            DatesText.Text = $"Створено: {_active.CreatedAt:dd.MM.yyyy HH:mm}   " +
                             $"Змінено: {_active.UpdatedAt:dd.MM.yyyy HH:mm}";
        }

        private void OnDelete_Click(object sender, RoutedEventArgs e)
        {
            if (_active == null) return;

            var result = MessageBox.Show(
                $"Видалити нотатку «{_active.Title}»?",
                "Підтвердження", MessageBoxButton.YesNo, MessageBoxImage.Warning);

            if (result != MessageBoxResult.Yes) return;

            _notes.Remove(_active);
            _active = null;
            TitleBox.Text   = "";
            ContentBox.Text = "";
            DatesText.Text  = "";
            _dirty = false;

            RefreshList();
            SaveAll();
        }

        private void OnExportXml_Click(object sender, RoutedEventArgs e)
        {
            var dlg = new SaveFileDialog
            {
                Filter   = "XML файл|*.xml",
                FileName = $"notes_export_{DateTime.Now:yyyyMMdd}"
            };

            if (dlg.ShowDialog() != true) return;

            _exporter.Export(_notes, dlg.FileName);
            SetStatus($"Експортовано у {System.IO.Path.GetFileName(dlg.FileName)}");
        }

        // ── Допоміжні методи ─────────────────────────────────────────

        private void RefreshList()
        {
            // Зберігаємо вибір
            var selected = NotesList.SelectedItem;
            NotesList.Items.Clear();

            foreach (var note in _notes.OrderByDescending(n => n.UpdatedAt))
                NotesList.Items.Add(note);

            if (selected != null && _notes.Contains(selected as Note))
                NotesList.SelectedItem = selected;
        }

        private bool ConfirmDiscard()
        {
            if (!_dirty) return true;
            var r = MessageBox.Show("Є незбережені зміни. Продовжити?",
                                     "Підтвердження",
                                     MessageBoxButton.YesNo,
                                     MessageBoxImage.Question);
            return r == MessageBoxResult.Yes;
        }

        private void SetStatus(string msg) => StatusText.Text = msg;

        protected override void OnClosing(System.ComponentModel.CancelEventArgs e)
        {
            if (_dirty)
            {
                var r = MessageBox.Show("Зберегти зміни перед виходом?",
                                         "Вихід",
                                         MessageBoxButton.YesNoCancel,
                                         MessageBoxImage.Question);
                if (r == MessageBoxResult.Cancel) { e.Cancel = true; return; }
                if (r == MessageBoxResult.Yes)    SaveAll();
            }
            base.OnClosing(e);
        }
    }
}
```

## Як виглядає notes.json

```json
[
  {
    "id": 1,
    "title": "Список покупок",
    "content": "Молоко\nХліб\nЯйця",
    "createdAt": "2024-03-15T10:23:00",
    "updatedAt": "2024-03-15T11:05:32"
  },
  {
    "id": 2,
    "title": "Ідея проекту",
    "content": "Зробити мобільний додаток для відстеження бюджету",
    "createdAt": "2024-03-14T09:00:00",
    "updatedAt": "2024-03-14T09:00:00",
    "category": "work"
  }
]
```

## Як виглядає notes_export.xml

```xml
<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<notes exportedAt="2024-03-15T11:30:00.000+02:00" count="2">
  <note id="1" category="general">
    <title>Список покупок</title>
    <content>Молоко
Хліб
Яйця</content>
    <createdAt>2024-03-15T10:23:00.0000000</createdAt>
    <updatedAt>2024-03-15T11:05:32.0000000</updatedAt>
  </note>
  <note id="2" category="work">
    <title>Ідея проекту</title>
    <content>Зробити мобільний додаток для відстеження бюджету</content>
    <createdAt>2024-03-14T09:00:00.0000000</createdAt>
    <updatedAt>2024-03-14T09:00:00.0000000</updatedAt>
  </note>
</notes>
```

## Підсумок: XML vs JSON — коли що обрати

| Критерій | XML | JSON |
|---|---|---|
| **Читабельність** | Середня (більше розмітки) | Висока |
| **Розмір файлу** | Більший | Менший |
| **Атрибути** | Є (зручно для метаданих) | Немає (всі поля рівнозначні) |
| **Коментарі** | Підтримує | Не підтримує |
| **Схема валідації** | XSD, DTD | JSON Schema |
| **REST API** | Рідко | Стандарт |
| **Конфігурація .NET** | `app.config` | `appsettings.json` |
| **Документи (Word, SVG)** | Ідеально | Не підходить |
| **Простота роботи у C#** | Потребує LINQ to XML | `JsonSerializer` у 2 рядки |

**Емпіричне правило:**
- Обмін з **веб-сервісами** та збереження **простих структур** → **JSON**
- Конфігурація зі **складною ієрархією**, документи, **взаємодія зі старими системами** → **XML**
