---
sidebar_position: 4
---

# Практичний WPF-додаток: журнал студентів (EF Core)

## Опис проекту

WPF-додаток **«Журнал»** з EF Core + SQLite:
- Групи і студенти зі зв'язком один-до-багатьох
- Перегляд і фільтрація у `DataGrid`
- Форма CRUD для студентів
- Вибір групи через `ComboBox`
- Автоматичне створення БД при запуску
- Статистика по групах

## Структура проекту

```
Journal/
├── Models/
│   ├── Student.cs
│   └── Group.cs
├── Data/
│   └── AppDbContext.cs
├── MainWindow.xaml
└── MainWindow.xaml.cs
```

NuGet: `Microsoft.EntityFrameworkCore.Sqlite`

## Моделі та контекст

```csharp
// Models/Group.cs
using System.ComponentModel.DataAnnotations;

public class Group
{
    public int           Id       { get; set; }
    [Required, MaxLength(50)]
    public string        Name     { get; set; } = string.Empty;
    public List<Student> Students { get; set; } = new();

    public override string ToString() => Name;
}

// Models/Student.cs
using System.ComponentModel.DataAnnotations;

public class Student
{
    public int    Id      { get; set; }
    [Required, MaxLength(200)]
    public string Name    { get; set; } = string.Empty;
    [Range(0, 100)]
    public int    Grade   { get; set; }
    public string? Email  { get; set; }
    public int?   GroupId { get; set; }
    public Group? Group   { get; set; }

    public override string ToString() => Name;
}
```

```csharp
// Data/AppDbContext.cs
using Microsoft.EntityFrameworkCore;

public class AppDbContext : DbContext
{
    public DbSet<Student> Students { get; set; }
    public DbSet<Group>   Groups   { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder o)
        => o.UseSqlite("Data Source=journal.db");

    protected override void OnModelCreating(ModelBuilder mb)
    {
        mb.Entity<Group>()
            .HasMany(g => g.Students)
            .WithOne(s => s.Group)
            .HasForeignKey(s => s.GroupId)
            .OnDelete(DeleteBehavior.SetNull);

        // Seed: стартові групи
        mb.Entity<Group>().HasData(
            new Group { Id = 1, Name = "ПЗ-21" },
            new Group { Id = 2, Name = "ПЗ-22" }
        );
    }
}
```

## XAML

```xml
<Window x:Class="Journal.MainWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Журнал студентів" Height="600" Width="920"
        Background="#1e1e2e">

    <Window.Resources>
        <Style x:Key="Btn" TargetType="Button">
            <Setter Property="Background"      Value="#313244"/>
            <Setter Property="Foreground"      Value="#cdd6f4"/>
            <Setter Property="BorderThickness" Value="0"/>
            <Setter Property="Padding"         Value="14,7"/>
            <Setter Property="Margin"          Value="4,2"/>
            <Setter Property="Cursor"          Value="Hand"/>
        </Style>
        <Style x:Key="Lbl" TargetType="TextBlock">
            <Setter Property="Foreground" Value="#6c7086"/>
            <Setter Property="Margin"     Value="0,0,0,3"/>
        </Style>
        <Style x:Key="Inp" TargetType="TextBox">
            <Setter Property="Background"      Value="#313244"/>
            <Setter Property="Foreground"      Value="#cdd6f4"/>
            <Setter Property="BorderThickness" Value="0"/>
            <Setter Property="Padding"         Value="8,5"/>
            <Setter Property="Margin"          Value="0,0,0,10"/>
        </Style>
    </Window.Resources>

    <Grid Margin="12">
        <Grid.ColumnDefinitions>
            <ColumnDefinition Width="*"/>
            <ColumnDefinition Width="260"/>
        </Grid.ColumnDefinitions>

        <!-- Ліва панель: список -->
        <DockPanel Grid.Column="0" Margin="0,0,12,0">
            <StackPanel DockPanel.Dock="Top" Margin="0,0,0,8">
                <TextBlock Text="Журнал студентів"
                           Foreground="#cdd6f4" FontSize="20" FontWeight="Bold"
                           Margin="0,0,0,10"/>
                <Grid>
                    <Grid.ColumnDefinitions>
                        <ColumnDefinition Width="*"/>
                        <ColumnDefinition Width="130"/>
                        <ColumnDefinition Width="Auto"/>
                    </Grid.ColumnDefinitions>

                    <TextBox x:Name="SearchBox" Grid.Column="0"
                             Background="#313244" Foreground="#cdd6f4"
                             BorderThickness="0" Padding="8,5"
                             TextChanged="OnSearch"/>

                    <ComboBox x:Name="GroupFilter" Grid.Column="1"
                              Background="#313244" Foreground="#cdd6f4"
                              BorderThickness="0" Padding="8,5"
                              Margin="8,0"
                              SelectionChanged="OnGroupFilter"
                              DisplayMemberPath="Name"/>

                    <Button Grid.Column="2" Content="+ Додати"
                            Style="{StaticResource Btn}"
                            Background="#89b4fa" Foreground="#1e1e2e"
                            Click="OnAdd_Click"/>
                </Grid>
            </StackPanel>

            <Border DockPanel.Dock="Bottom" Background="#181825"
                    CornerRadius="6" Padding="12,6" Margin="0,8,0,0">
                <TextBlock x:Name="StatsText"
                           Foreground="#6c7086" FontFamily="Consolas"/>
            </Border>

            <DataGrid x:Name="StudentsGrid"
                      Background="#181825" Foreground="#cdd6f4"
                      BorderThickness="0"
                      GridLinesVisibility="Horizontal"
                      HorizontalGridLinesBrush="#313244"
                      AutoGenerateColumns="False"
                      IsReadOnly="True"
                      SelectionMode="Single"
                      SelectionChanged="OnStudentSelected">
                <DataGrid.Columns>
                    <DataGridTextColumn Header="ID"    Binding="{Binding Id}"         Width="50"/>
                    <DataGridTextColumn Header="Ім'я"  Binding="{Binding Name}"        Width="*"/>
                    <DataGridTextColumn Header="Оцінка" Binding="{Binding Grade}"      Width="80"/>
                    <DataGridTextColumn Header="Email" Binding="{Binding Email}"       Width="180"/>
                    <DataGridTextColumn Header="Група" Binding="{Binding Group.Name}"  Width="100"/>
                </DataGrid.Columns>
            </DataGrid>
        </DockPanel>

        <!-- Права панель: форма -->
        <Border Grid.Column="1" Background="#181825" CornerRadius="8" Padding="16">
            <StackPanel>
                <TextBlock x:Name="FormTitle" Text="Новий студент"
                           Foreground="#cdd6f4" FontSize="15" FontWeight="Bold"
                           Margin="0,0,0,14"/>

                <TextBlock Text="Ім'я"            Style="{StaticResource Lbl}"/>
                <TextBox   x:Name="NameBox"       Style="{StaticResource Inp}"/>

                <TextBlock Text="Оцінка (0–100)"  Style="{StaticResource Lbl}"/>
                <TextBox   x:Name="GradeBox"      Style="{StaticResource Inp}"/>

                <TextBlock Text="Email"            Style="{StaticResource Lbl}"/>
                <TextBox   x:Name="EmailBox"      Style="{StaticResource Inp}"/>

                <TextBlock Text="Група"            Style="{StaticResource Lbl}"/>
                <ComboBox  x:Name="GroupCombo"
                           Background="#313244" Foreground="#cdd6f4"
                           BorderThickness="0" Padding="8,5" Margin="0,0,0,16"
                           DisplayMemberPath="Name"/>

                <Button Content="Зберегти"
                        Style="{StaticResource Btn}"
                        Background="#a6e3a1" Foreground="#1e1e2e"
                        Margin="0,0,0,4"
                        Click="OnSave_Click"/>

                <Button x:Name="DeleteBtn" Content="Видалити"
                        Style="{StaticResource Btn}"
                        Background="#f38ba8" Foreground="#1e1e2e"
                        IsEnabled="False"
                        Click="OnDelete_Click"/>

                <TextBlock x:Name="ErrorText"
                           Foreground="#f38ba8" FontSize="11"
                           Margin="0,10,0,0" TextWrapping="Wrap"/>
            </StackPanel>
        </Border>
    </Grid>
</Window>
```

## Code-behind

```csharp
using System.Windows;
using System.Windows.Controls;
using Microsoft.EntityFrameworkCore;

namespace Journal
{
    public partial class MainWindow : Window
    {
        private readonly AppDbContext _db = new();
        private Student? _editing;

        public MainWindow()
        {
            InitializeComponent();
            _db.Database.EnsureCreated();
            Loaded += OnLoaded;
        }

        private void OnLoaded(object sender, RoutedEventArgs e)
        {
            LoadGroups();
            Refresh();
            ClearForm();
        }

        // ── Дані ────────────────────────────────────────────────────

        private void LoadGroups()
        {
            var groups = _db.Groups.AsNoTracking().OrderBy(g => g.Name).ToList();

            // Фільтр (перший елемент — "Всі")
            var filterList = new List<object> { new GroupFilterAll() };
            filterList.AddRange(groups);
            GroupFilter.ItemsSource        = filterList;
            GroupFilter.DisplayMemberPath  = "Name";
            GroupFilter.SelectedIndex      = 0;

            // Форма
            var comboList = new List<object?> { null };
            comboList.AddRange(groups);
            GroupCombo.ItemsSource   = comboList;
            GroupCombo.SelectedIndex = 0;
        }

        private void Refresh()
        {
            string? search  = string.IsNullOrWhiteSpace(SearchBox.Text) ? null : SearchBox.Text;
            int?    groupId = GroupFilter.SelectedItem is Group g ? g.Id : null;

            var query = _db.Students
                .Include(s => s.Group)
                .AsNoTracking()
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
                query = query.Where(s =>
                    s.Name.Contains(search) ||
                    (s.Email != null && s.Email.Contains(search)));

            if (groupId.HasValue)
                query = query.Where(s => s.GroupId == groupId);

            var list = query.OrderBy(s => s.Name).ToList();
            StudentsGrid.ItemsSource = list;

            int    total = list.Count;
            double avg   = total > 0 ? list.Average(s => s.Grade) : 0;
            StatsText.Text = $"Всього: {total}  |  Середня оцінка: {avg:F1}";
        }

        // ── UI дії ──────────────────────────────────────────────────

        private void OnSearch(object sender, TextChangedEventArgs e) => Refresh();
        private void OnGroupFilter(object sender, SelectionChangedEventArgs e) => Refresh();

        private void OnStudentSelected(object sender, SelectionChangedEventArgs e)
        {
            if (StudentsGrid.SelectedItem is not Student s) return;
            _editing            = s;
            FormTitle.Text      = "Редагування";
            NameBox.Text        = s.Name;
            GradeBox.Text       = s.Grade.ToString();
            EmailBox.Text       = s.Email ?? "";
            DeleteBtn.IsEnabled = true;
            ErrorText.Text      = "";

            GroupCombo.SelectedItem = s.GroupId.HasValue
                ? (GroupCombo.ItemsSource as List<object?>)?
                    .OfType<Group>().FirstOrDefault(g => g.Id == s.GroupId.Value)
                : null;
        }

        private void OnAdd_Click(object sender, RoutedEventArgs e) => ClearForm();

        private void OnSave_Click(object sender, RoutedEventArgs e)
        {
            ErrorText.Text = "";

            if (string.IsNullOrWhiteSpace(NameBox.Text))
            { ErrorText.Text = "Введіть ім'я"; return; }

            if (!int.TryParse(GradeBox.Text, out int grade) || grade < 0 || grade > 100)
            { ErrorText.Text = "Оцінка — від 0 до 100"; return; }

            Group? group = GroupCombo.SelectedItem as Group;

            if (_editing == null)
            {
                _db.Students.Add(new Student
                {
                    Name    = NameBox.Text.Trim(),
                    Grade   = grade,
                    Email   = string.IsNullOrWhiteSpace(EmailBox.Text) ? null : EmailBox.Text.Trim(),
                    GroupId = group?.Id
                });
            }
            else
            {
                // Перечитуємо щоб EF Core міг відстежити зміни
                var tracked = _db.Students.Find(_editing.Id);
                if (tracked != null)
                {
                    tracked.Name    = NameBox.Text.Trim();
                    tracked.Grade   = grade;
                    tracked.Email   = string.IsNullOrWhiteSpace(EmailBox.Text) ? null : EmailBox.Text.Trim();
                    tracked.GroupId = group?.Id;
                }
            }

            _db.SaveChanges();
            ClearForm();
            Refresh();
        }

        private void OnDelete_Click(object sender, RoutedEventArgs e)
        {
            if (_editing == null) return;

            var r = MessageBox.Show($"Видалити «{_editing.Name}»?",
                "Підтвердження", MessageBoxButton.YesNo, MessageBoxImage.Warning);
            if (r != MessageBoxResult.Yes) return;

            var tracked = _db.Students.Find(_editing.Id);
            if (tracked != null) _db.Students.Remove(tracked);
            _db.SaveChanges();

            ClearForm();
            Refresh();
        }

        // ── Допоміжні ───────────────────────────────────────────────

        private void ClearForm()
        {
            _editing                  = null;
            FormTitle.Text            = "Новий студент";
            NameBox.Text              = "";
            GradeBox.Text             = "";
            EmailBox.Text             = "";
            GroupCombo.SelectedIndex  = 0;
            DeleteBtn.IsEnabled       = false;
            ErrorText.Text            = "";
            StudentsGrid.SelectedItem = null;
        }

        protected override void OnClosed(EventArgs e)
        {
            _db.Dispose();
            base.OnClosed(e);
        }
    }

    // Допоміжний об'єкт для пункту "Всі групи" у фільтрі
    public class GroupFilterAll
    {
        public string Name => "(Всі групи)";
    }
}
```

## Порівняння ADO.NET і EF Core

| | ADO.NET (Тема 23) | EF Core (Тема 24) |
|---|---|---|
| **SQL** | Вручну | Генерується автоматично |
| **Міграції** | SQL-скрипти вручну | `dotnet ef migrations add` |
| **CRUD** | `SqliteCommand` + параметри | `Add()`, `Find()`, `Remove()`, `SaveChanges()` |
| **Зв'язки (JOIN)** | SQL JOIN вручну | `.Include()` / `.ThenInclude()` |
| **Швидкість коду** | Повільніше писати | Швидше |
| **Контроль над SQL** | Повний | Обмежений (але можна через `FromSqlRaw`) |
| **Коли обирати** | Складний тюнінг, нестандартні запити | 90% звичайних проектів |
