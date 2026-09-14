---
sidebar_position: 3
---

# Практичний WPF-додаток: список студентів (ADO.NET)

## Опис проекту

WPF-додаток **«Студенти»** з чистим ADO.NET + SQLite:
- Відображення списку студентів у `DataGrid`
- Додавання, редагування, видалення через форму
- Пошук за ім'ям
- Статистика: кількість, середня оцінка
- Автоматичне створення таблиці при першому запуску

## Структура проекту

```
StudentsApp/
├── Models/
│   └── Student.cs
├── Data/
│   └── StudentRepository.cs
├── MainWindow.xaml
└── MainWindow.xaml.cs
```

Підключити NuGet: `Microsoft.Data.Sqlite`

## Модель та репозиторій

```csharp
// Models/Student.cs
public class Student
{
    public int    Id    { get; set; }
    public string Name  { get; set; } = string.Empty;
    public int    Grade { get; set; }
    public string Email { get; set; } = string.Empty;

    public override string ToString() => Name;
}
```

```csharp
// Data/StudentRepository.cs
using Microsoft.Data.Sqlite;

public class StudentRepository
{
    private readonly string _cs;

    public StudentRepository(string dbPath = "students.db")
    {
        _cs = $"Data Source={dbPath}";
        EnsureCreated();
    }

    private SqliteConnection Open()
    {
        var c = new SqliteConnection(_cs);
        c.Open();
        return c;
    }

    private void EnsureCreated()
    {
        using var c = Open();
        using var cmd = c.CreateCommand();
        cmd.CommandText = """
            CREATE TABLE IF NOT EXISTS students (
                id    INTEGER PRIMARY KEY AUTOINCREMENT,
                name  TEXT    NOT NULL,
                grade INTEGER NOT NULL DEFAULT 0,
                email TEXT    NOT NULL DEFAULT ''
            )
            """;
        cmd.ExecuteNonQuery();
    }

    public List<Student> GetAll(string? search = null)
    {
        using var c = Open();
        using var cmd = c.CreateCommand();

        if (string.IsNullOrWhiteSpace(search))
        {
            cmd.CommandText = "SELECT id, name, grade, email FROM students ORDER BY name";
        }
        else
        {
            cmd.CommandText = """
                SELECT id, name, grade, email FROM students
                WHERE name LIKE $q OR email LIKE $q
                ORDER BY name
                """;
            cmd.Parameters.AddWithValue("$q", $"%{search}%");
        }

        var list = new List<Student>();
        using var r = cmd.ExecuteReader();
        while (r.Read())
            list.Add(Map(r));
        return list;
    }

    public Student Add(Student s)
    {
        using var c = Open();
        using var cmd = c.CreateCommand();
        cmd.CommandText = """
            INSERT INTO students (name, grade, email) VALUES ($n, $g, $e);
            SELECT last_insert_rowid();
            """;
        cmd.Parameters.AddWithValue("$n", s.Name);
        cmd.Parameters.AddWithValue("$g", s.Grade);
        cmd.Parameters.AddWithValue("$e", s.Email);
        s.Id = (int)(long)cmd.ExecuteScalar();
        return s;
    }

    public void Update(Student s)
    {
        using var c = Open();
        using var cmd = c.CreateCommand();
        cmd.CommandText = "UPDATE students SET name=$n, grade=$g, email=$e WHERE id=$id";
        cmd.Parameters.AddWithValue("$n",  s.Name);
        cmd.Parameters.AddWithValue("$g",  s.Grade);
        cmd.Parameters.AddWithValue("$e",  s.Email);
        cmd.Parameters.AddWithValue("$id", s.Id);
        cmd.ExecuteNonQuery();
    }

    public void Delete(int id)
    {
        using var c = Open();
        using var cmd = c.CreateCommand();
        cmd.CommandText = "DELETE FROM students WHERE id = $id";
        cmd.Parameters.AddWithValue("$id", id);
        cmd.ExecuteNonQuery();
    }

    public (int count, double avg) GetStats()
    {
        using var c = Open();
        using var cmd = c.CreateCommand();
        cmd.CommandText = "SELECT COUNT(*), COALESCE(AVG(grade), 0) FROM students";
        using var r = cmd.ExecuteReader();
        r.Read();
        return ((int)(long)r.GetValue(0), r.GetDouble(1));
    }

    private static Student Map(SqliteDataReader r) => new()
    {
        Id    = r.GetInt32(r.GetOrdinal("id")),
        Name  = r.GetString(r.GetOrdinal("name")),
        Grade = r.GetInt32(r.GetOrdinal("grade")),
        Email = r.GetString(r.GetOrdinal("email")),
    };
}
```

## XAML

```xml
<Window x:Class="StudentsApp.MainWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Студенти" Height="580" Width="860"
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
            <ColumnDefinition Width="240"/>
        </Grid.ColumnDefinitions>

        <!-- Ліва частина: список -->
        <DockPanel Grid.Column="0" Margin="0,0,12,0">

            <StackPanel DockPanel.Dock="Top" Margin="0,0,0,8">
                <TextBlock Text="Список студентів"
                           Foreground="#cdd6f4" FontSize="20" FontWeight="Bold"
                           Margin="0,0,0,10"/>
                <Grid>
                    <Grid.ColumnDefinitions>
                        <ColumnDefinition Width="*"/>
                        <ColumnDefinition Width="Auto"/>
                    </Grid.ColumnDefinitions>
                    <TextBox x:Name="SearchBox" Grid.Column="0"
                             Background="#313244" Foreground="#cdd6f4"
                             BorderThickness="0" Padding="8,5"
                             TextChanged="OnSearch"/>
                    <Button Grid.Column="1" Content="+ Додати"
                            Style="{StaticResource Btn}"
                            Background="#89b4fa" Foreground="#1e1e2e"
                            Margin="8,0,0,0"
                            Click="OnAdd_Click"/>
                </Grid>
            </StackPanel>

            <Border DockPanel.Dock="Bottom" Background="#181825"
                    CornerRadius="6" Padding="12,6" Margin="0,8,0,0">
                <TextBlock x:Name="StatsText" Foreground="#6c7086" FontFamily="Consolas"/>
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
                    <DataGridTextColumn Header="ID"    Binding="{Binding Id}"    Width="50"/>
                    <DataGridTextColumn Header="Ім'я"  Binding="{Binding Name}"  Width="*"/>
                    <DataGridTextColumn Header="Оцінка" Binding="{Binding Grade}" Width="80"/>
                    <DataGridTextColumn Header="Email" Binding="{Binding Email}" Width="200"/>
                </DataGrid.Columns>
            </DataGrid>
        </DockPanel>

        <!-- Права частина: форма -->
        <Border Grid.Column="1" Background="#181825" CornerRadius="8" Padding="16">
            <StackPanel>
                <TextBlock x:Name="FormTitle" Text="Новий студент"
                           Foreground="#cdd6f4" FontSize="15" FontWeight="Bold"
                           Margin="0,0,0,14"/>

                <TextBlock Text="Ім'я"          Style="{StaticResource Lbl}"/>
                <TextBox   x:Name="NameBox"     Style="{StaticResource Inp}"/>

                <TextBlock Text="Оцінка (0–100)" Style="{StaticResource Lbl}"/>
                <TextBox   x:Name="GradeBox"    Style="{StaticResource Inp}"/>

                <TextBlock Text="Email"          Style="{StaticResource Lbl}"/>
                <TextBox   x:Name="EmailBox"    Style="{StaticResource Inp}"/>

                <Button Content="Зберегти"
                        Style="{StaticResource Btn}"
                        Background="#a6e3a1" Foreground="#1e1e2e"
                        Margin="0,6,0,4"
                        Click="OnSave_Click"/>

                <Button x:Name="DeleteBtn"
                        Content="Видалити"
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

namespace StudentsApp
{
    public partial class MainWindow : Window
    {
        private readonly StudentRepository _repo = new();
        private Student? _editing;

        public MainWindow()
        {
            InitializeComponent();
            Loaded += (_, _) => Refresh();
        }

        private void Refresh(string? search = null)
        {
            var list = _repo.GetAll(search);
            StudentsGrid.ItemsSource = list;

            var (count, avg) = _repo.GetStats();
            StatsText.Text = $"Всього: {count}  |  Середня: {avg:F1}";
        }

        private void OnSearch(object sender, TextChangedEventArgs e)
            => Refresh(string.IsNullOrWhiteSpace(SearchBox.Text) ? null : SearchBox.Text);

        private void OnStudentSelected(object sender, SelectionChangedEventArgs e)
        {
            if (StudentsGrid.SelectedItem is not Student s) return;
            _editing        = s;
            FormTitle.Text  = "Редагування";
            NameBox.Text    = s.Name;
            GradeBox.Text   = s.Grade.ToString();
            EmailBox.Text   = s.Email;
            DeleteBtn.IsEnabled = true;
            ErrorText.Text  = "";
        }

        private void OnAdd_Click(object sender, RoutedEventArgs e) => ClearForm();

        private void OnSave_Click(object sender, RoutedEventArgs e)
        {
            ErrorText.Text = "";

            if (string.IsNullOrWhiteSpace(NameBox.Text))
            { ErrorText.Text = "Введіть ім'я"; return; }

            if (!int.TryParse(GradeBox.Text, out int grade) || grade < 0 || grade > 100)
            { ErrorText.Text = "Оцінка — від 0 до 100"; return; }

            if (_editing == null)
            {
                _repo.Add(new Student
                {
                    Name  = NameBox.Text.Trim(),
                    Grade = grade,
                    Email = EmailBox.Text.Trim()
                });
            }
            else
            {
                _editing.Name  = NameBox.Text.Trim();
                _editing.Grade = grade;
                _editing.Email = EmailBox.Text.Trim();
                _repo.Update(_editing);
            }

            ClearForm();
            Refresh(string.IsNullOrWhiteSpace(SearchBox.Text) ? null : SearchBox.Text);
        }

        private void OnDelete_Click(object sender, RoutedEventArgs e)
        {
            if (_editing == null) return;

            var r = MessageBox.Show($"Видалити «{_editing.Name}»?",
                "Підтвердження", MessageBoxButton.YesNo, MessageBoxImage.Warning);
            if (r != MessageBoxResult.Yes) return;

            _repo.Delete(_editing.Id);
            ClearForm();
            Refresh(string.IsNullOrWhiteSpace(SearchBox.Text) ? null : SearchBox.Text);
        }

        private void ClearForm()
        {
            _editing            = null;
            FormTitle.Text      = "Новий студент";
            NameBox.Text        = "";
            GradeBox.Text       = "";
            EmailBox.Text       = "";
            DeleteBtn.IsEnabled = false;
            ErrorText.Text      = "";
            StudentsGrid.SelectedItem = null;
        }
    }
}
```
