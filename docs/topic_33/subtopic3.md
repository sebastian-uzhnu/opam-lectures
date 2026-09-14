---
sidebar_position: 4
---

# Практичний WPF-додаток: паралельна обробка зображень

## Огляд проекту

Побудуємо повноцінний WPF-додаток, який:
- Дозволяє вибрати папку із зображеннями
- Обробляє їх **паралельно** (`Parallel.ForEach` з `CancellationToken`)
- Звітує про прогрес через **`Progress<T>`** (потокобезпечно)
- Порівнює час послідовної та паралельної обробки через **`Stopwatch`**
- Дозволяє скасувати обробку у будь-який момент

## XAML: темна тема Catppuccin Mocha

```xml
<Window x:Class="ParallelImageProcessor.MainWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Паралельна обробка зображень"
        Height="650" Width="900"
        Background="#1e1e2e">

    <Window.Resources>
        <!-- Стиль кнопки (Catppuccin Mocha: Mauve accent) -->
        <Style x:Key="MochaButton" TargetType="Button">
            <Setter Property="Background" Value="#cba4f7"/>
            <Setter Property="Foreground" Value="#1e1e2e"/>
            <Setter Property="FontWeight" Value="SemiBold"/>
            <Setter Property="Padding" Value="14,7"/>
            <Setter Property="BorderThickness" Value="0"/>
            <Setter Property="Cursor" Value="Hand"/>
            <Setter Property="Template">
                <Setter.Value>
                    <ControlTemplate TargetType="Button">
                        <Border Background="{TemplateBinding Background}"
                                CornerRadius="6"
                                Padding="{TemplateBinding Padding}">
                            <ContentPresenter HorizontalAlignment="Center"
                                              VerticalAlignment="Center"/>
                        </Border>
                        <ControlTemplate.Triggers>
                            <Trigger Property="IsMouseOver" Value="True">
                                <Setter Property="Background" Value="#b4befe"/>
                            </Trigger>
                            <Trigger Property="IsEnabled" Value="False">
                                <Setter Property="Background" Value="#45475a"/>
                                <Setter Property="Foreground" Value="#6c7086"/>
                            </Trigger>
                        </ControlTemplate.Triggers>
                    </ControlTemplate>
                </Setter.Value>
            </Setter>
        </Style>

        <!-- Стиль кнопки скасування (Red) -->
        <Style x:Key="CancelButton" TargetType="Button" BasedOn="{StaticResource MochaButton}">
            <Setter Property="Background" Value="#f38ba8"/>
        </Style>
    </Window.Resources>

    <Grid Margin="20">
        <Grid.RowDefinitions>
            <RowDefinition Height="Auto"/>  <!-- Заголовок -->
            <RowDefinition Height="Auto"/>  <!-- Вибір папки -->
            <RowDefinition Height="Auto"/>  <!-- Кнопки дій -->
            <RowDefinition Height="Auto"/>  <!-- Прогрес-бар -->
            <RowDefinition Height="Auto"/>  <!-- Статистика -->
            <RowDefinition Height="*"/>     <!-- Лог -->
        </Grid.RowDefinitions>

        <!-- Заголовок -->
        <TextBlock Grid.Row="0"
                   Text="Паралельна обробка зображень"
                   FontSize="22" FontWeight="Bold"
                   Foreground="#cdd6f4"
                   Margin="0,0,0,16"/>

        <!-- Вибір папки -->
        <Grid Grid.Row="1" Margin="0,0,0,12">
            <Grid.ColumnDefinitions>
                <ColumnDefinition Width="*"/>
                <ColumnDefinition Width="Auto"/>
            </Grid.ColumnDefinitions>
            <Border Grid.Column="0"
                    Background="#313244" CornerRadius="6"
                    Padding="10,6" Margin="0,0,8,0">
                <TextBlock x:Name="FolderPathText"
                           Text="Папку не вибрано..."
                           Foreground="#a6adc8"
                           VerticalAlignment="Center"
                           TextTrimming="CharacterEllipsis"/>
            </Border>
            <Button Grid.Column="1"
                    Content="Вибрати папку"
                    Style="{StaticResource MochaButton}"
                    Click="OnSelectFolder_Click"/>
        </Grid>

        <!-- Кнопки дій -->
        <StackPanel Grid.Row="2" Orientation="Horizontal"
                    Margin="0,0,0,16">
            <Button x:Name="BtnSequential"
                    Content="Послідовна обробка"
                    Style="{StaticResource MochaButton}"
                    Margin="0,0,8,0"
                    Click="OnSequential_Click"/>
            <Button x:Name="BtnParallel"
                    Content="Паралельна обробка"
                    Style="{StaticResource MochaButton}"
                    Margin="0,0,8,0"
                    Click="OnParallel_Click"/>
            <Button x:Name="BtnCancel"
                    Content="Скасувати"
                    Style="{StaticResource CancelButton}"
                    IsEnabled="False"
                    Click="OnCancel_Click"/>
        </StackPanel>

        <!-- Прогрес-бар -->
        <Grid Grid.Row="3" Margin="0,0,0,12">
            <Grid.ColumnDefinitions>
                <ColumnDefinition Width="*"/>
                <ColumnDefinition Width="Auto"/>
            </Grid.ColumnDefinitions>
            <ProgressBar x:Name="ProgressBar"
                         Grid.Column="0"
                         Height="18"
                         Background="#313244"
                         Foreground="#a6e3a1"
                         BorderThickness="0"
                         Margin="0,0,12,0"/>
            <TextBlock x:Name="ProgressText"
                       Grid.Column="1"
                       Text="0 / 0"
                       Foreground="#cdd6f4"
                       VerticalAlignment="Center"
                       Width="60"
                       TextAlignment="Right"/>
        </Grid>

        <!-- Статистика часу -->
        <Border Grid.Row="4"
                Background="#313244" CornerRadius="8"
                Padding="14,10" Margin="0,0,0,12">
            <Grid>
                <Grid.ColumnDefinitions>
                    <ColumnDefinition Width="*"/>
                    <ColumnDefinition Width="*"/>
                    <ColumnDefinition Width="*"/>
                </Grid.ColumnDefinitions>

                <StackPanel Grid.Column="0">
                    <TextBlock Text="Послідовно"
                               Foreground="#6c7086" FontSize="11"/>
                    <TextBlock x:Name="SeqTimeText"
                               Text="— мс"
                               Foreground="#f38ba8"
                               FontSize="18" FontWeight="Bold"/>
                </StackPanel>

                <StackPanel Grid.Column="1" HorizontalAlignment="Center">
                    <TextBlock Text="Паралельно"
                               Foreground="#6c7086" FontSize="11"/>
                    <TextBlock x:Name="ParTimeText"
                               Text="— мс"
                               Foreground="#a6e3a1"
                               FontSize="18" FontWeight="Bold"/>
                </StackPanel>

                <StackPanel Grid.Column="2" HorizontalAlignment="Right">
                    <TextBlock Text="Прискорення"
                               Foreground="#6c7086" FontSize="11"/>
                    <TextBlock x:Name="SpeedupText"
                               Text="—"
                               Foreground="#cba4f7"
                               FontSize="18" FontWeight="Bold"/>
                </StackPanel>
            </Grid>
        </Border>

        <!-- Лог повідомлень -->
        <Border Grid.Row="5"
                Background="#181825" CornerRadius="8"
                Padding="10">
            <ScrollViewer x:Name="LogScroller"
                          VerticalScrollBarVisibility="Auto">
                <TextBlock x:Name="LogText"
                           Foreground="#cdd6f4"
                           FontFamily="Cascadia Code, Consolas, monospace"
                           FontSize="12"
                           TextWrapping="Wrap"/>
            </ScrollViewer>
        </Border>
    </Grid>
</Window>
```

## Code-behind: MainWindow.xaml.cs

```csharp
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using Microsoft.Win32;

namespace ParallelImageProcessor
{
    public partial class MainWindow : Window
    {
        // ── Стан ──────────────────────────────────────────────────────
        private string[]? _imageFiles;
        private CancellationTokenSource? _cts;
        private long _sequentialMs = -1;
        private long _parallelMs   = -1;

        // ── Конструктор ───────────────────────────────────────────────
        public MainWindow()
        {
            InitializeComponent();
        }

        // ── Вибір папки ───────────────────────────────────────────────
        private void OnSelectFolder_Click(object sender, RoutedEventArgs e)
        {
            // OpenFolderDialog доступний у .NET 8+ WPF
            var dialog = new OpenFolderDialog
            {
                Title = "Виберіть папку із зображеннями"
            };

            if (dialog.ShowDialog() == true)
            {
                var folder = dialog.FolderName;
                _imageFiles = Directory
                    .GetFiles(folder, "*.*")
                    .Where(f => IsImageFile(f))
                    .ToArray();

                FolderPathText.Text = folder;
                Log($"Знайдено {_imageFiles.Length} зображень у: {folder}");

                ProgressBar.Maximum = _imageFiles.Length;
                ProgressBar.Value   = 0;
                ProgressText.Text   = $"0 / {_imageFiles.Length}";
            }
        }

        // ── Послідовна обробка ────────────────────────────────────────
        private async void OnSequential_Click(object sender, RoutedEventArgs e)
        {
            if (!ValidateInput()) return;

            SetUiBusy(true);
            ClearLog();
            Log("▶ Починаємо ПОСЛІДОВНУ обробку...");

            int processed = 0;
            int total = _imageFiles!.Length;
            ResetProgress(total);

            // Progress<T> — потокобезпечний: колбек виконується у UI-потоці
            var progress = new Progress<(int Current, string FileName)>(report =>
            {
                ProgressBar.Value = report.Current;
                ProgressText.Text = $"{report.Current} / {total}";
                Log($"  ✓ {report.FileName}");
                LogScroller.ScrollToEnd();
            });

            var sw = Stopwatch.StartNew();

            await Task.Run(() =>
            {
                foreach (var filePath in _imageFiles!)
                {
                    ProcessImageFile(filePath);
                    processed++;
                    ((IProgress<(int, string)>)progress).Report(
                        (processed, Path.GetFileName(filePath)));
                }
            });

            sw.Stop();
            _sequentialMs = sw.ElapsedMilliseconds;

            SeqTimeText.Text = $"{_sequentialMs} мс";
            Log($"✅ Послідовно завершено за {_sequentialMs} мс");
            UpdateSpeedup();
            SetUiBusy(false);
        }

        // ── Паралельна обробка ────────────────────────────────────────
        private async void OnParallel_Click(object sender, RoutedEventArgs e)
        {
            if (!ValidateInput()) return;

            _cts = new CancellationTokenSource();
            SetUiBusy(true);
            BtnCancel.IsEnabled = true;
            ClearLog();
            Log("▶ Починаємо ПАРАЛЕЛЬНУ обробку...");

            int processed = 0;
            int total = _imageFiles!.Length;
            ResetProgress(total);

            // Progress<T>: звіт про прогрес з будь-якого потоку
            var progress = new Progress<(int Current, string FileName)>(report =>
            {
                ProgressBar.Value = report.Current;
                ProgressText.Text = $"{report.Current} / {total}";
                Log($"  ✓ [{Thread.CurrentThread.ManagedThreadId:D2}] {report.FileName}");
                LogScroller.ScrollToEnd();
            });

            var options = new ParallelOptions
            {
                MaxDegreeOfParallelism = Environment.ProcessorCount,
                CancellationToken      = _cts.Token
            };

            var sw = Stopwatch.StartNew();

            try
            {
                await Task.Run(() =>
                {
                    Parallel.ForEach(_imageFiles!, options, filePath =>
                    {
                        options.CancellationToken.ThrowIfCancellationRequested();

                        ProcessImageFile(filePath);

                        // Interlocked.Increment — атомарне збільшення лічильника
                        int current = Interlocked.Increment(ref processed);

                        ((IProgress<(int, string)>)progress).Report(
                            (current, Path.GetFileName(filePath)));
                    });
                }, _cts.Token);

                sw.Stop();
                _parallelMs = sw.ElapsedMilliseconds;

                ParTimeText.Text = $"{_parallelMs} мс";
                Log($"✅ Паралельно завершено за {_parallelMs} мс " +
                    $"(ядер: {Environment.ProcessorCount})");
                UpdateSpeedup();
            }
            catch (OperationCanceledException)
            {
                sw.Stop();
                Log($"⚠ Обробку скасовано на {processed} / {total} файлів " +
                    $"за {sw.ElapsedMilliseconds} мс");
            }
            finally
            {
                _cts.Dispose();
                _cts = null;
                BtnCancel.IsEnabled = false;
                SetUiBusy(false);
            }
        }

        // ── Скасування ────────────────────────────────────────────────
        private void OnCancel_Click(object sender, RoutedEventArgs e)
        {
            _cts?.Cancel();
            Log("🛑 Надіслано сигнал скасування...");
        }

        // ── Обробка одного файлу (імітація важкої роботи) ─────────────
        private static void ProcessImageFile(string filePath)
        {
            // Читаємо зображення, застосовуємо розмиття (CPU-bound), зберігаємо
            using var original = new Bitmap(filePath);
            using var processed = ApplyGaussianBlur(original);

            var outputDir = Path.Combine(
                Path.GetDirectoryName(filePath)!, "processed");
            Directory.CreateDirectory(outputDir);

            var outputPath = Path.Combine(outputDir,
                "proc_" + Path.GetFileName(filePath));
            processed.Save(outputPath, ImageFormat.Jpeg);

            // Затримка для наочності (видалити у реальному проекті)
            Thread.Sleep(50);
        }

        // Просте розмиття (аналог Gaussian blur через averaging)
        private static Bitmap ApplyGaussianBlur(Bitmap source)
        {
            var result = new Bitmap(source.Width, source.Height);
            int radius = 2;

            for (int y = radius; y < source.Height - radius; y++)
            {
                for (int x = radius; x < source.Width - radius; x++)
                {
                    int r = 0, g = 0, b = 0, count = 0;
                    for (int dy = -radius; dy <= radius; dy++)
                    {
                        for (int dx = -radius; dx <= radius; dx++)
                        {
                            var pixel = source.GetPixel(x + dx, y + dy);
                            r += pixel.R; g += pixel.G; b += pixel.B; count++;
                        }
                    }
                    result.SetPixel(x, y, Color.FromArgb(r/count, g/count, b/count));
                }
            }
            return result;
        }

        // ── Допоміжні методи ──────────────────────────────────────────
        private static bool IsImageFile(string path)
        {
            var ext = Path.GetExtension(path).ToLowerInvariant();
            return ext is ".jpg" or ".jpeg" or ".png" or ".bmp";
        }

        private bool ValidateInput()
        {
            if (_imageFiles == null || _imageFiles.Length == 0)
            {
                MessageBox.Show("Спочатку виберіть папку із зображеннями!",
                    "Помилка", MessageBoxButton.OK, MessageBoxImage.Warning);
                return false;
            }
            return true;
        }

        private void SetUiBusy(bool busy)
        {
            BtnSequential.IsEnabled = !busy;
            BtnParallel.IsEnabled   = !busy;
        }

        private void ResetProgress(int total)
        {
            ProgressBar.Maximum = total;
            ProgressBar.Value   = 0;
            ProgressText.Text   = $"0 / {total}";
        }

        private void UpdateSpeedup()
        {
            if (_sequentialMs > 0 && _parallelMs > 0)
            {
                double speedup = (double)_sequentialMs / _parallelMs;
                SpeedupText.Text = $"{speedup:F1}x";
            }
        }

        private void Log(string message)
        {
            var timestamp = DateTime.Now.ToString("HH:mm:ss.fff");
            LogText.Text += $"[{timestamp}] {message}\n";
        }

        private void ClearLog()
        {
            LogText.Text = string.Empty;
        }
    }
}
```

## Progress\<T\>: чому це важливо

`Progress<T>` — клас, що дозволяє безпечно звітувати про прогрес із фонових потоків у UI-потік:

```csharp
// ПРОБЛЕМА: пряме оновлення UI з не-UI потоку — виняток!
await Task.Run(() =>
{
    Parallel.ForEach(files, file =>
    {
        ProcessFile(file);
        ProgressBar.Value++;  // ❌ InvalidOperationException!
    });
});

// РІШЕННЯ: Progress<T> — автоматично маршалює виклик у UI-потік
var progress = new Progress<int>(value =>
{
    ProgressBar.Value = value;  // ✅ Завжди виконується в UI-потоці
});

await Task.Run(() =>
{
    int count = 0;
    Parallel.ForEach(files, file =>
    {
        ProcessFile(file);
        ((IProgress<int>)progress).Report(Interlocked.Increment(ref count));
    });
});
```

:::info Як працює Progress\<T\>
При створенні `Progress<T>` зберігає `SynchronizationContext` поточного потоку (UI-потоку). При виклику `Report()` з будь-якого потоку — колбек автоматично диспетчеризується у збережений контекст. Це потокобезпечна альтернатива `Dispatcher.Invoke`.
:::

## Порівняння часу: Stopwatch

```csharp
using System.Diagnostics;

// Правильне використання Stopwatch
var sw = Stopwatch.StartNew();   // StartNew() = new Stopwatch() + Start()

// ... операція ...

sw.Stop();
Console.WriteLine($"Час: {sw.ElapsedMilliseconds} мс");
Console.WriteLine($"Точний час: {sw.Elapsed.TotalMilliseconds:F3} мс");

// Перезапуск без виділення нового об'єкту
sw.Restart();
// ... друга операція ...
sw.Stop();

// Порівняння
double speedup = firstMs / (double)secondMs;
Console.WriteLine($"Прискорення: {speedup:F2}x");
```

:::tip Точний замір часу
Для точних вимірювань запускайте операцію кілька разів і беріть середнє або медіану. Перший запуск може бути повільнішим через JIT-компіляцію та прогрів кешу.
:::

---

## Підсумкова таблиця: що коли використовувати

| Інструмент | Рівень | Коли використовувати | Коли уникати |
|---|---|---|---|
| **`Thread`** | Низький | Довготривалі фонові задачі, точний контроль | Майже завжди — є кращі варіанти |
| **`Task`** | Середній | Асинхронні операції, `async/await` | Рідко потрібен напряму |
| **`Parallel`** | Середній | CPU-bound цикли над великими колекціями | IO-bound задачі, малі колекції |
| **`PLINQ`** | Середній | CPU-bound LINQ-запити над великими масивами | IO-bound, потрібен строгий порядок |
| **`TPL Dataflow`** | Вищий | Конвеєрна обробка, поєднання CPU+IO стадій | Прості одноетапні задачі |
| **`async/await`** | Середній | IO-bound: мережа, диск, БД | CPU-bound обчислення |
| **`Channel<T>`** | Середній | Producer-consumer, стрімінг даних | Складна топологія графу |

## Загальні рекомендації

### CPU-bound задачі → Parallel / PLINQ

```csharp
// ✅ Правильно: обчислення → Parallel
Parallel.ForEach(largeDataSet, item => HeavyComputation(item));

// ✅ Правильно: LINQ + обчислення → PLINQ
var results = data.AsParallel()
                  .Where(x => ExpensiveFilter(x))
                  .Select(x => ExpensiveTransform(x))
                  .ToArray();
```

### IO-bound задачі → async/await

```csharp
// ✅ Правильно: мережеві запити → async/await + Task.WhenAll
var tasks = urls.Select(url => httpClient.GetStringAsync(url));
var responses = await Task.WhenAll(tasks);

// ✅ Правильно: читання файлів → async IO
var contents = await Task.WhenAll(
    files.Select(f => File.ReadAllTextAsync(f))
);

// ❌ Неправильно: Parallel для IO-bound — не дає переваги
Parallel.ForEach(urls, url => httpClient.GetString(url));  // блокує потоки!
```

### Складні конвеєри → TPL Dataflow

```csharp
// ✅ Правильно: читання (IO) → обробка (CPU) → збереження (IO)
// Кожна стадія оптимізована окремо через MaxDegreeOfParallelism
var readBlock   = new TransformBlock<string, byte[]>(ReadFileAsync,
    new ExecutionDataflowBlockOptions { MaxDegreeOfParallelism = 8 });  // IO: більше потоків
var processBlock = new TransformBlock<byte[], byte[]>(ProcessData,
    new ExecutionDataflowBlockOptions { MaxDegreeOfParallelism = Environment.ProcessorCount });
var saveBlock   = new ActionBlock<byte[]>(SaveFileAsync,
    new ExecutionDataflowBlockOptions { MaxDegreeOfParallelism = 8 });  // IO: більше потоків
```

:::tip Золоте правило
Питайте себе: **чому задача повільна?** Якщо відповідь — _"процесор завантажений"_, використовуйте `Parallel`/`PLINQ`. Якщо відповідь — _"чекаємо мережу/диск"_, використовуйте `async/await`. Якщо обидва — `TPL Dataflow` з різними налаштуваннями для кожної стадії.
:::
