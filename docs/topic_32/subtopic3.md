---
sidebar_position: 4
---

# Практичний WPF-додаток: завантажувач файлів

У цьому розділі побудуємо повноцінний WPF-застосунок, що демонструє всі вивчені концепції разом:

- Паралельне завантаження кількох URL через `HttpClient`
- Звітування прогресу через `IProgress<T>` / `Progress<T>`
- Скасування через `CancellationTokenSource`
- Асинхронне програмування `async/await`
- Темна тема Catppuccin Mocha

## Концепція Progress\<T\>

Клас `Progress<T>` вирішує проблему передачі прогресу з фонового потоку на UI-потік **безпечно та елегантно**.

### Без Progress\<T\> (неправильно):

```csharp
// Доводиться вручну викликати Dispatcher.Invoke на кожне оновлення
await Task.Run(() =>
{
    for (int i = 0; i <= 100; i++)
    {
        Thread.Sleep(50);
        Dispatcher.Invoke(() => progressBar.Value = i); // Громіздко!
    }
});
```

### З Progress\<T\> (правильно):

```csharp
// IProgress<T> — інтерфейс для звітування прогресу
// Progress<T> — реалізація, що автоматично маршалізує на UI-потік

IProgress<int> progress = new Progress<int>(value =>
{
    // Цей код автоматично виконується на UI-потоці!
    progressBar.Value   = value;
    statusLabel.Content = $"{value}%";
});

await Task.Run(() =>
{
    for (int i = 0; i <= 100; i++)
    {
        Thread.Sleep(50);
        progress.Report(i); // Безпечно з будь-якого потоку
    }
});
```

### IProgress\<T\> інтерфейс

```csharp
public interface IProgress<in T>
{
    void Report(T value);
}
```

Чому передавати `IProgress<T>`, а не `Progress<T>`? Це дозволяє:
- Замінити реалізацію (логування, тестування) без зміни сигнатури
- Підкреслити, що метод не контролює "як" відображати прогрес

```csharp
// Метод приймає інтерфейс — не залежить від UI
async Task ProcessFilesAsync(IProgress<string> progress, CancellationToken token)
{
    string[] files = Directory.GetFiles(".", "*.txt");
    for (int i = 0; i < files.Length; i++)
    {
        token.ThrowIfCancellationRequested();
        await ProcessOneFileAsync(files[i]);
        progress.Report($"Оброблено {i + 1}/{files.Length}: {Path.GetFileName(files[i])}");
    }
}
```

## Структура даних для прогресу

Визначимо запис для передачі детального прогресу завантаження:

```csharp
// Дані про прогрес одного завантаження
public record DownloadProgress(
    string   Url,
    int      Index,       // Індекс у списку
    long     BytesReceived,
    long     TotalBytes,  // -1 якщо невідомо
    bool     IsCompleted,
    bool     IsError,
    string   ErrorMessage = ""
)
{
    public int Percent => TotalBytes > 0
        ? (int)(BytesReceived * 100 / TotalBytes)
        : -1; // Невідомо

    public string StatusText => IsError
        ? $"Помилка: {ErrorMessage}"
        : IsCompleted
            ? $"Завершено ({BytesReceived:N0} байт)"
            : TotalBytes > 0
                ? $"{Percent}% ({BytesReceived:N0} / {TotalBytes:N0} байт)"
                : $"{BytesReceived:N0} байт...";
}
```

## Повний XAML (темна тема Catppuccin Mocha)

```xml
<Window x:Class="FileDownloader.MainWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Завантажувач файлів"
        Height="600" Width="780"
        MinHeight="480" MinWidth="600"
        Background="#1e1e2e"
        FontFamily="Segoe UI" FontSize="13">

    <Window.Resources>
        <!-- Стиль кнопок -->
        <Style x:Key="MochaButton" TargetType="Button">
            <Setter Property="Background"   Value="#313244"/>
            <Setter Property="Foreground"   Value="#cdd6f4"/>
            <Setter Property="BorderBrush"  Value="#585b70"/>
            <Setter Property="BorderThickness" Value="1"/>
            <Setter Property="Padding"      Value="16,8"/>
            <Setter Property="Cursor"       Value="Hand"/>
            <Setter Property="Template">
                <Setter.Value>
                    <ControlTemplate TargetType="Button">
                        <Border Background="{TemplateBinding Background}"
                                BorderBrush="{TemplateBinding BorderBrush}"
                                BorderThickness="{TemplateBinding BorderThickness}"
                                CornerRadius="6"
                                Padding="{TemplateBinding Padding}">
                            <ContentPresenter HorizontalAlignment="Center"
                                              VerticalAlignment="Center"/>
                        </Border>
                        <ControlTemplate.Triggers>
                            <Trigger Property="IsMouseOver" Value="True">
                                <Setter Property="Background" Value="#45475a"/>
                            </Trigger>
                            <Trigger Property="IsPressed" Value="True">
                                <Setter Property="Background" Value="#585b70"/>
                            </Trigger>
                            <Trigger Property="IsEnabled" Value="False">
                                <Setter Property="Opacity" Value="0.4"/>
                            </Trigger>
                        </ControlTemplate.Triggers>
                    </ControlTemplate>
                </Setter.Value>
            </Setter>
        </Style>

        <!-- Стиль TextBox -->
        <Style x:Key="MochaTextBox" TargetType="TextBox">
            <Setter Property="Background"   Value="#313244"/>
            <Setter Property="Foreground"   Value="#cdd6f4"/>
            <Setter Property="BorderBrush"  Value="#585b70"/>
            <Setter Property="BorderThickness" Value="1"/>
            <Setter Property="Padding"      Value="8,6"/>
            <Setter Property="CaretBrush"   Value="#cdd6f4"/>
            <Setter Property="SelectionBrush" Value="#89b4fa"/>
        </Style>
    </Window.Resources>

    <Grid Margin="20">
        <Grid.RowDefinitions>
            <RowDefinition Height="Auto"/>  <!-- Заголовок -->
            <RowDefinition Height="Auto"/>  <!-- Поля вводу -->
            <RowDefinition Height="Auto"/>  <!-- Кнопки -->
            <RowDefinition Height="*"/>     <!-- Список прогресу -->
            <RowDefinition Height="Auto"/>  <!-- Статус-бар -->
        </Grid.RowDefinitions>

        <!-- Заголовок -->
        <StackPanel Grid.Row="0" Margin="0,0,0,16">
            <TextBlock Text="Завантажувач файлів"
                       Foreground="#cba6f7"
                       FontSize="22" FontWeight="SemiBold"/>
            <TextBlock Text="Паралельне завантаження з async/await, Progress&lt;T&gt; та CancellationToken"
                       Foreground="#6c7086" FontSize="11" Margin="0,2,0,0"/>
        </StackPanel>

        <!-- Поля вводу URL -->
        <Border Grid.Row="1"
                Background="#181825" CornerRadius="8"
                Padding="14" Margin="0,0,0,12">
            <StackPanel>
                <TextBlock Text="URL для завантаження (по одному на рядок):"
                           Foreground="#a6adc8" Margin="0,0,0,6"/>
                <TextBox x:Name="UrlsTextBox"
                         Style="{StaticResource MochaTextBox}"
                         Height="90"
                         AcceptsReturn="True"
                         VerticalScrollBarVisibility="Auto"
                         TextWrapping="Wrap"
                         Text="https://httpbin.org/bytes/102400&#x0a;https://httpbin.org/bytes/204800&#x0a;https://httpbin.org/bytes/51200"/>
            </StackPanel>
        </Border>

        <!-- Кнопки управління -->
        <WrapPanel Grid.Row="2" Orientation="Horizontal" Margin="0,0,0,12">
            <Button x:Name="StartButton"
                    Content="▶  Завантажити"
                    Style="{StaticResource MochaButton}"
                    Foreground="#a6e3a1"
                    Margin="0,0,8,0"
                    Click="OnStart_Click"/>

            <Button x:Name="CancelButton"
                    Content="✕  Скасувати"
                    Style="{StaticResource MochaButton}"
                    Foreground="#f38ba8"
                    Margin="0,0,8,0"
                    IsEnabled="False"
                    Click="OnCancel_Click"/>

            <Button x:Name="ClearButton"
                    Content="⟳  Очистити"
                    Style="{StaticResource MochaButton}"
                    Margin="0,0,0,0"
                    Click="OnClear_Click"/>
        </WrapPanel>

        <!-- Список прогресу завантажень -->
        <Border Grid.Row="3"
                Background="#181825" CornerRadius="8"
                Padding="4" Margin="0,0,0,12">
            <ScrollViewer x:Name="ProgressScroll"
                          VerticalScrollBarVisibility="Auto">
                <ItemsControl x:Name="DownloadsList">
                    <ItemsControl.ItemTemplate>
                        <DataTemplate>
                            <!-- Один елемент — один рядок завантаження -->
                            <Border Margin="8,4" Padding="12,10"
                                    Background="#313244" CornerRadius="6">
                                <Grid>
                                    <Grid.ColumnDefinitions>
                                        <ColumnDefinition Width="*"/>
                                        <ColumnDefinition Width="Auto"/>
                                    </Grid.ColumnDefinitions>
                                    <Grid.RowDefinitions>
                                        <RowDefinition Height="Auto"/>
                                        <RowDefinition Height="Auto"/>
                                        <RowDefinition Height="Auto"/>
                                    </Grid.RowDefinitions>

                                    <!-- URL -->
                                    <TextBlock Grid.Row="0" Grid.Column="0"
                                               Text="{Binding ShortUrl}"
                                               Foreground="#89b4fa"
                                               FontWeight="Medium"
                                               TextTrimming="CharacterEllipsis"/>

                                    <!-- Відсоток -->
                                    <TextBlock Grid.Row="0" Grid.Column="1"
                                               Text="{Binding PercentText}"
                                               Foreground="#a6adc8"
                                               Margin="8,0,0,0"/>

                                    <!-- ProgressBar -->
                                    <ProgressBar Grid.Row="1" Grid.ColumnSpan="2"
                                                 Value="{Binding ProgressValue}"
                                                 Maximum="100" Height="6"
                                                 Margin="0,6,0,4"
                                                 Background="#45475a"
                                                 Foreground="{Binding ProgressColor}"/>

                                    <!-- Статус -->
                                    <TextBlock Grid.Row="2" Grid.ColumnSpan="2"
                                               Text="{Binding StatusText}"
                                               Foreground="#6c7086" FontSize="11"/>
                                </Grid>
                            </Border>
                        </DataTemplate>
                    </ItemsControl.ItemTemplate>
                </ItemsControl>
            </ScrollViewer>
        </Border>

        <!-- Статус-бар -->
        <Border Grid.Row="4"
                Background="#181825" CornerRadius="6"
                Padding="10,6">
            <Grid>
                <TextBlock x:Name="StatusText"
                           Foreground="#a6adc8" FontSize="12"
                           Text="Готово до завантаження"/>
                <TextBlock x:Name="ElapsedText"
                           Foreground="#6c7086" FontSize="12"
                           HorizontalAlignment="Right"/>
            </Grid>
        </Border>
    </Grid>
</Window>
```

## Модель ViewModel для рядка завантаження

```csharp
using System.ComponentModel;
using System.Runtime.CompilerServices;
using System.Windows.Media;

namespace FileDownloader
{
    // ViewModel для одного рядка у списку завантажень
    public class DownloadItemViewModel : INotifyPropertyChanged
    {
        private string _shortUrl      = "";
        private string _percentText   = "0%";
        private double _progressValue = 0;
        private string _statusText    = "Очікування...";
        private Brush  _progressColor = new SolidColorBrush(Color.FromRgb(0x89, 0xb4, 0xfa)); // #89b4fa

        public string ShortUrl
        {
            get => _shortUrl;
            set { _shortUrl = value; OnPropertyChanged(); }
        }

        public string PercentText
        {
            get => _percentText;
            set { _percentText = value; OnPropertyChanged(); }
        }

        public double ProgressValue
        {
            get => _progressValue;
            set { _progressValue = value; OnPropertyChanged(); }
        }

        public string StatusText
        {
            get => _statusText;
            set { _statusText = value; OnPropertyChanged(); }
        }

        public Brush ProgressColor
        {
            get => _progressColor;
            set { _progressColor = value; OnPropertyChanged(); }
        }

        // Зручний метод оновлення з DownloadProgress
        public void Update(DownloadProgress p)
        {
            ProgressValue = p.Percent >= 0 ? p.Percent : 50; // Анімований якщо невідомо

            PercentText = p.Percent >= 0 ? $"{p.Percent}%" : "...";
            StatusText  = p.StatusText;

            // Колір прогресу: синій → зелений → червоний
            if (p.IsError)
                ProgressColor = new SolidColorBrush(Color.FromRgb(0xf3, 0x8b, 0xa8)); // #f38ba8 red
            else if (p.IsCompleted)
                ProgressColor = new SolidColorBrush(Color.FromRgb(0xa6, 0xe3, 0xa1)); // #a6e3a1 green
            else
                ProgressColor = new SolidColorBrush(Color.FromRgb(0x89, 0xb4, 0xfa)); // #89b4fa blue
        }

        public event PropertyChangedEventHandler? PropertyChanged;
        private void OnPropertyChanged([CallerMemberName] string? name = null)
            => PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(name));
    }
}
```

## Повний code-behind з async/await, HttpClient, Progress\<T\>, CancellationToken

```csharp
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Threading;

namespace FileDownloader
{
    public partial class MainWindow : Window
    {
        // HttpClient — рекомендовано один екземпляр на весь час роботи застосунку
        private static readonly HttpClient _httpClient = new()
        {
            Timeout = TimeSpan.FromSeconds(30)
        };

        private CancellationTokenSource? _cts;
        private readonly DispatcherTimer  _timer = new();
        private Stopwatch                 _stopwatch = new();

        public MainWindow()
        {
            InitializeComponent();

            // Таймер для відображення часу, що минув
            _timer.Interval = TimeSpan.FromMilliseconds(100);
            _timer.Tick += (_, _) =>
                ElapsedText.Text = $"Час: {_stopwatch.Elapsed:mm\\:ss\\.f}";
        }

        private async void OnStart_Click(object sender, RoutedEventArgs e)
        {
            // Зчитуємо URL з текстового поля
            string[] urls = UrlsTextBox.Text
                .Split('\n', StringSplitOptions.RemoveEmptyEntries)
                .Select(u => u.Trim())
                .Where(u => u.StartsWith("http", StringComparison.OrdinalIgnoreCase))
                .ToArray();

            if (urls.Length == 0)
            {
                StatusText.Text = "Введіть хоча б один URL.";
                return;
            }

            // Готуємо UI
            StartButton.IsEnabled  = false;
            CancelButton.IsEnabled = true;
            ClearButton.IsEnabled  = false;
            DownloadsList.Items.Clear();

            _cts = new CancellationTokenSource();

            // Створюємо ViewModels для кожного URL
            var viewModels = new DownloadItemViewModel[urls.Length];
            for (int i = 0; i < urls.Length; i++)
            {
                var vm = new DownloadItemViewModel
                {
                    ShortUrl = urls[i].Length > 60
                        ? "..." + urls[i][^57..]
                        : urls[i]
                };
                viewModels[i] = vm;
                DownloadsList.Items.Add(vm);
            }

            // Запускаємо таймер
            _stopwatch.Restart();
            _timer.Start();
            StatusText.Text = $"Завантажуємо {urls.Length} файл(ів)...";

            try
            {
                await DownloadAllAsync(urls, viewModels, _cts.Token);

                int completed = viewModels.Count(vm =>
                    vm.StatusText.StartsWith("Завершено"));
                StatusText.Text = $"Готово: {completed}/{urls.Length} завантажено успішно.";
            }
            catch (OperationCanceledException)
            {
                StatusText.Text = "Завантаження скасоване.";

                // Позначаємо незавершені як скасовані
                foreach (var vm in viewModels)
                {
                    if (!vm.StatusText.StartsWith("Завершено") &&
                        !vm.StatusText.StartsWith("Помилка"))
                    {
                        vm.StatusText    = "Скасовано";
                        vm.ProgressValue = 0;
                    }
                }
            }
            finally
            {
                _timer.Stop();
                _cts.Dispose();
                _cts = null;

                StartButton.IsEnabled  = true;
                CancelButton.IsEnabled = false;
                ClearButton.IsEnabled  = true;
            }
        }

        private void OnCancel_Click(object sender, RoutedEventArgs e)
        {
            _cts?.Cancel();
            StatusText.Text = "Надіслано запит на скасування...";
        }

        private void OnClear_Click(object sender, RoutedEventArgs e)
        {
            DownloadsList.Items.Clear();
            StatusText.Text  = "Готово до завантаження";
            ElapsedText.Text = "";
            _stopwatch.Reset();
        }

        // Запускаємо всі завантаження паралельно
        private async Task DownloadAllAsync(
            string[]                  urls,
            DownloadItemViewModel[]   viewModels,
            CancellationToken         token)
        {
            // Для кожного URL — свій Progress<DownloadProgress>
            // Progress<T> автоматично маршалізує на UI-потік
            var tasks = new Task[urls.Length];

            for (int i = 0; i < urls.Length; i++)
            {
                int index    = i; // Захоплюємо для лямбди
                var vm       = viewModels[i];

                // Створюємо Progress<T> для цього завантаження
                // Callback виконується на UI-потоці автоматично!
                IProgress<DownloadProgress> progress = new Progress<DownloadProgress>(p =>
                {
                    vm.Update(p);
                });

                // Запускаємо завантаження — всі Task стартують без await (паралельно!)
                tasks[i] = DownloadSingleAsync(urls[index], index, progress, token);
            }

            // Чекаємо ВСІХ — вони виконувались паралельно
            await Task.WhenAll(tasks);
        }

        // Завантаження одного URL з детальним звітом прогресу
        private async Task DownloadSingleAsync(
            string                      url,
            int                         index,
            IProgress<DownloadProgress> progress,
            CancellationToken           token)
        {
            try
            {
                // Надсилаємо HTTP запит (тільки заголовки, не весь вміст)
                using HttpResponseMessage response = await _httpClient
                    .GetAsync(url, HttpCompletionOption.ResponseHeadersRead, token);

                response.EnsureSuccessStatusCode();

                long totalBytes = response.Content.Headers.ContentLength ?? -1;
                long received   = 0;

                // Читаємо тіло відповіді потоком (stream) для відстеження прогресу
                await using System.IO.Stream stream =
                    await response.Content.ReadAsStreamAsync(token);

                byte[] buffer = new byte[8192]; // 8 КБ буфер
                int    bytesRead;

                while ((bytesRead = await stream.ReadAsync(buffer, token)) > 0)
                {
                    received += bytesRead;

                    // Звітуємо прогрес — Progress<T> сам перейде на UI-потік
                    progress.Report(new DownloadProgress(
                        Url:           url,
                        Index:         index,
                        BytesReceived: received,
                        TotalBytes:    totalBytes,
                        IsCompleted:   false,
                        IsError:       false
                    ));
                }

                // Завершено успішно
                progress.Report(new DownloadProgress(
                    Url:           url,
                    Index:         index,
                    BytesReceived: received,
                    TotalBytes:    received, // Тепер точний розмір відомий
                    IsCompleted:   true,
                    IsError:       false
                ));
            }
            catch (OperationCanceledException)
            {
                // Пробрасуємо — обробляється у OnStart_Click
                throw;
            }
            catch (HttpRequestException ex)
            {
                progress.Report(new DownloadProgress(
                    Url:          url,
                    Index:        index,
                    BytesReceived: 0,
                    TotalBytes:   -1,
                    IsCompleted:  false,
                    IsError:      true,
                    ErrorMessage: ex.Message
                ));
            }
            catch (Exception ex)
            {
                progress.Report(new DownloadProgress(
                    Url:          url,
                    Index:        index,
                    BytesReceived: 0,
                    TotalBytes:   -1,
                    IsCompleted:  false,
                    IsError:      true,
                    ErrorMessage: $"Невідома помилка: {ex.Message}"
                ));
            }
        }
    }
}
```

:::info Чому HttpCompletionOption.ResponseHeadersRead?
За замовчуванням `GetAsync` читає **всю** відповідь у пам'ять перш ніж повернути контроль. З `ResponseHeadersRead` ми отримуємо відповідь одразу після заголовків, а тіло читаємо порціями через stream — це дозволяє відстежувати прогрес завантаження і не завантажувати великі файли цілком у RAM.
:::

## Пояснення ключових архітектурних рішень

### Один HttpClient на весь застосунок

```csharp
// ПРАВИЛЬНО:
private static readonly HttpClient _httpClient = new();
// HttpClient реалізує пул з'єднань. Один екземпляр = ефективне повторне використання.

// НЕПРАВИЛЬНО:
private async Task BadDownload(string url)
{
    using var client = new HttpClient(); // Новий екземпляр на кожен запит!
    // Призводить до виснаження сокетів (socket exhaustion)
}
```

### Паралелізм через відкладений await

```csharp
// Паралельно: Task.WhenAll
var tasks = urls.Select(url => DownloadAsync(url, token)).ToArray();
await Task.WhenAll(tasks); // Всі Tasks запущені до першого await

// Послідовно: foreach з await
foreach (string url in urls)
    await DownloadAsync(url, token); // Кожне наступне чекає попереднє
```

### Progress<T> vs Dispatcher.Invoke

```csharp
// Старий стиль (явний Dispatcher):
Dispatcher.Invoke(() => progressBar.Value = percent);

// Новий стиль (Progress<T>):
IProgress<int> progress = new Progress<int>(v => progressBar.Value = v);
progress.Report(percent); // Автоматичний маршалінг на UI-потік
```

## Підсумкова таблиця: Thread vs ThreadPool vs Task vs async/await

| Характеристика | `Thread` | `ThreadPool` | `Task` | `async/await` |
|---|---|---|---|---|
| **Рівень абстракції** | Низький | Середній | Високий | Найвищий |
| **Новий потік** | Завжди | З пулу | З пулу | Не завжди |
| **Результат** | Тільки через змінні | Ні | `Task<T>.Result` | `return` |
| **Обробка помилок** | Складна | Ні | `AggregateException` | `try/catch` |
| **Скасування** | Вручну (прапорці) | Ні | `CancellationToken` | `CancellationToken` |
| **Прогрес** | Dispatcher.Invoke | Dispatcher.Invoke | `IProgress<T>` | `IProgress<T>` |
| **Ланцюжок задач** | Вручну | Ні | `ContinueWith` | Лінійний код |
| **Дедлок ризик** | Низький | Низький | Є (.Result у WPF) | Низький (якщо async all the way) |
| **Коли використовувати** | Рідко (legacy, LongRunning) | Рідко (QueueUserWorkItem) | Паралельні обчислення | Весь сучасний async-код |

:::tip Золоте правило вибору
- Потрібен просто фоновий потік без результату → `Task.Run`
- Потрібен результат → `Task<T>` + `await`
- Потрібно кілька паралельних операцій → `Task.WhenAll`
- Потрібна відмова від дії → `CancellationToken`
- Потрібен прогрес → `IProgress<T>` + `Progress<T>`
- `Thread` напряму — тільки для спеціальних випадків (`LongRunning`, `STA thread` для COM)
:::

## Корисні ресурси для подальшого вивчення

- [Microsoft Docs: Asynchronous programming with async and await](https://learn.microsoft.com/en-us/dotnet/csharp/asynchronous-programming/)
- [Microsoft Docs: Task Parallel Library (TPL)](https://learn.microsoft.com/en-us/dotnet/standard/parallel-programming/task-parallel-library-tpl)
- [Stephen Cleary: Async/Await — Best Practices](https://learn.microsoft.com/en-us/archive/msdn-magazine/2013/march/async-await-best-practices-in-asynchronous-programming)
- [Microsoft Docs: CancellationToken](https://learn.microsoft.com/en-us/dotnet/api/system.threading.cancellationtoken)
- [Microsoft Docs: IProgress\<T\>](https://learn.microsoft.com/en-us/dotnet/api/system.iprogress-1)
