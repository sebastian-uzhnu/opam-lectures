# Ревізія тем 21–35, вступу та конфігурації

Рецензовано: `_bundle/g3.txt` (теми 21–35), `_bundle/g0.txt` (`docs/intro.md`, `docs/c-sharp.md`, `sidebars.ts`, `docusaurus.config.ts`, `docs/extra/`).
Еталон оформлення: `/home/claude/lectures/STYLE.md`.

---

## Зведення

| Тема | Обсяг (рядків md) | Технологія прикладів | Оцінка | Головна проблема |
|---|---|---|---|---|
| 21. Windows Forms | 4 файли, 39+43+57+98 = **237** | WinForms (1 блок коду на всю тему) | 2/5 | Утричі менше норми STYLE.md; 3 з 4 файлів **без жодного рядка коду**, без admonitions, без таблиць |
| 22. Елементи керування | 4 файли, **365** | WinForms | 3/5 | Немає `TabControl`, `Anchor`/`Dock` (є у програмі); 0 admonitions, 0 таблиць |
| 23. Діалоги, MDI, меню | 4 файли, **413** | WinForms | 3/5 | **Немає меню, контекстних меню, ToolStrip, StatusStrip** — половина опису теми |
| 24. Події та складні контроли | — | — | — | ПОРОЖНЯ |
| 25. Колекції та DataGridView | — | — | — | ПОРОЖНЯ |
| 26. 2D-графіка | — | — | — | ПОРОЖНЯ |
| 27. Рядки та regex | — | — | — | ПОРОЖНЯ |
| 28. LINQ | — | — | — | ПОРОЖНЯ |
| 29. XML та JSON | 4 файли, **1222** | консоль + **WPF** (`subtopic3`) | 4/5 | Практикум на WPF при WinForms-курсі; немає XSD-валідації та REST API з опису |
| 30. БД / ADO.NET | 4 файли, **1192** | консоль + **WPF** (`subtopic2`) | 3.5/5 | `subtopic1` і `subtopic3` **дублюють одне одного** (транзакції, JOIN, bulk insert); посилання на «Тему 24» замість 31 |
| 31. EF Core | 4 файли, **1166** | консоль + **WPF** (`subtopic3`) | 4/5 | Database First згадано одним реченням; таблиця порівняння посилається на «Тему 23/24» |
| 32. Потоки + синхронізація | **8 файлів, 4195** | консоль + **WPF** (3 файли) | 3/5 | Механічне злиття: 8 підрозділів замість 3–5; `async/await` тут, а має бути в темі 33 |
| 33. Паралельне/асинхронне | 4 файли, **1647** | консоль + **WPF** (`subtopic3`) | 3.5/5 | Не містить нічого з програми («Task, Wait, WhenAll, async/await») — усе це в темі 32 |
| 34. Збірки, локалізація, безпека | — | — | — | ПОРОЖНЯ |
| 35. Мережа, розгортання | — | — | — | ПОРОЖНЯ |

Наскрізне: **`practice.md` немає в жодній із 15 тем 2 семестру** (`grep practice.md` по обох бандлах → 0 збігів). За STYLE.md це обов'язковий файл (`sidebar_position: 90`) із 12–18 питаннями, 3–5 міні-задачами і домашнім завданням. Це 15 відсутніх файлів.

---

## Питання WinForms vs WPF

### Повна таблиця «файл → технологія»

| Файл | Технологія прикладів | Ознака |
|---|---|---|
| `docs/topic_21/intro.md` | **WinForms** (тільки текст) | `System.Windows.Forms`, `Form1.Designer.cs`, `Application.Run` |
| `docs/topic_21/subtopic1.md` | **WinForms** (тільки текст) | Toolbox, Designer, `InitializeComponent()` |
| `docs/topic_21/subtopic2.md` | **WinForms** (тільки текст) | властивості `Form`, події `Load`/`Shown` |
| `docs/topic_21/subtopic3.md` | **WinForms** | `public partial class Form1 : Form`, `MessageBox.Show(...)` |
| `docs/topic_22/intro.md` | **WinForms** (текст) | Label/TextBox/RichTextBox/CheckBox/RadioButton |
| `docs/topic_22/subtopic1.md` | **WinForms** | `TreeNode`, `dataGridView1.Columns.Add(...)` |
| `docs/topic_22/subtopic2.md` | **WinForms** | `KeyPressEventArgs`, `panel1.CreateGraphics()` |
| `docs/topic_22/subtopic3.md` | **WinForms** | `Form1 : Form`, `chkVipCustomer.Checked` |
| `docs/topic_23/intro.md` | **WinForms** | `OpenFileDialog`, `SaveFileDialog`, `DialogResult.OK` |
| `docs/topic_23/subtopic1.md` | **WinForms** | `SettingsForm : Form`, `ShowDialog()` |
| `docs/topic_23/subtopic2.md` | **WinForms** | `IsMdiContainer`, `LayoutMdi(MdiLayout.Cascade)` |
| `docs/topic_23/subtopic3.md` | **WinForms** | `EditUserForm : Form`, `ColorChanged?.Invoke(Color.Red)` |
| `docs/topic_29/intro.md` | консоль | `Console.WriteLine`, `XDocument` |
| `docs/topic_29/subtopic1.md` | консоль | `XmlSerializer`, `StreamWriter` |
| `docs/topic_29/subtopic2.md` | консоль | `JsonSerializer`, `File.ReadAllText` |
| `docs/topic_29/subtopic3.md` | **WPF** | заголовок «Практичний WPF-додаток», `<Window x:Class="NotesApp.MainWindow">`, `MainWindow : Window`, `Microsoft.Win32.SaveFileDialog` |
| `docs/topic_30/intro.md` | консоль | `SqliteConnection`, `Console.WriteLine` |
| `docs/topic_30/subtopic1.md` | консоль (у схемі згадано `MainWindow`) | `StudentRepository`, ADO.NET |
| `docs/topic_30/subtopic2.md` | **WPF** | «Практичний WPF-додаток», `<Window x:Class="StudentsApp.MainWindow">`, `<DataGrid>` |
| `docs/topic_30/subtopic3.md` | консоль | JOIN, транзакції |
| `docs/topic_31/intro.md` | консоль | `AppDbContext`, `db.SaveChanges()` |
| `docs/topic_31/subtopic1.md` | консоль + CLI | `dotnet ef migrations add` |
| `docs/topic_31/subtopic2.md` | консоль | `Include`/`ThenInclude`, `HasData` |
| `docs/topic_31/subtopic3.md` | **WPF** | «Практичний WPF-додаток», `<Window x:Class="Journal.MainWindow">`, `ComboBox`, `DataGrid` |
| `docs/topic_32/intro.md` | консоль + **WPF** | розділ «Приклад WPF: довга операція та Dispatcher.Invoke», `<Window x:Class="ThreadingDemo.MainWindow">` |
| `docs/topic_32/subtopic1.md` | консоль | `Task.Run`, `ThreadPool` |
| `docs/topic_32/subtopic2.md` | консоль + **WPF-фрагменти** | `RoutedEventArgs`, `StatusLabel.Content`, «Дедлок у WPF» |
| `docs/topic_32/subtopic3.md` | **WPF** | «Практичний WPF-додаток: завантажувач файлів», повний XAML + `INotifyPropertyChanged` |
| `docs/topic_32/sync_intro.md` | консоль | `lock`, `Monitor`, `volatile` |
| `docs/topic_32/sync_subtopic1.md` | консоль | `Mutex`, `SemaphoreSlim`, `ReaderWriterLockSlim` |
| `docs/topic_32/sync_subtopic2.md` | консоль | `Interlocked`, `Concurrent*`, `Immutable*` |
| `docs/topic_32/sync_subtopic3.md` | **WPF** | «побудуємо WPF-застосунок», повний XAML з `ControlTemplate` |
| `docs/topic_33/intro.md` | консоль | `Parallel.For/ForEach/Invoke` |
| `docs/topic_33/subtopic1.md` | консоль | PLINQ |
| `docs/topic_33/subtopic2.md` | консоль | TPL Dataflow |
| `docs/topic_33/subtopic3.md` | **WPF** | «Практичний WPF-додаток», `<Window x:Class="ParallelImageProcessor.MainWindow">` |
| `docs/extra/wpf_animations/*` (4) | **WPF** (свідомо, факультатив) | Storyboard, Canvas |
| `docs/extra/wpf_sprites/*` (4) | **WPF** (свідомо, факультатив) | CroppedBitmap, DispatcherTimer |

**Підсумок:** 12 файлів WinForms (теми 21–23), 16 файлів консольних, **8 файлів основного курсу на WPF** (по одному «практичному застосунку» в кінці кожної з тем 29–33 + WPF-розділ у `topic_32/intro.md`), 8 файлів WPF у факультативі.

### Висновок

Курс зараз навчає студента WinForms у темах 21–26 (за програмою), а потім у кожній наступній темі показує «фінальний застосунок» на WPF з XAML, `DataGrid`, `Binding`, `INotifyPropertyChanged`, темою Catppuccin Mocha. Студент, який пройшов теми 21–23, **не має жодних знань про XAML, Binding, DataTemplate, Dispatcher** — і одразу отримує 400–700 рядків WPF-коду, який має «просто переписати». Це найбільший розрив у курсі.

**Варіант А — вирівняти все на WinForms (рекомендовано).**
Переписати 8 WPF-практикумів (29/sub3, 30/sub2, 31/sub3, 32/intro-WPF-розділ, 32/sub3, 32/sync_sub3, 33/sub3) на Windows Forms.
- Ціна: ~2500 рядків коду переписати. XAML → `Designer`-опис або програмна ініціалізація; `DataGrid` → `DataGridView`; `Binding`/`INotifyPropertyChanged` → `BindingList<T>` + `DataSource`; `Dispatcher.Invoke` → `Control.Invoke`/`BeginInvoke`; `Progress<T>` працює без змін; `Microsoft.Win32.SaveFileDialog` → `System.Windows.Forms.SaveFileDialog`. Темна тема Catppuccin у WinForms не відтворюється — практикуми втратять «вау-ефект», але будуть погоджені з програмою і з темами 24–26, які ще треба писати.
- Плюс: теми 24 («динамічне створення елементів»), 25 (`DataGridView`), 26 (`Chart`, GDI+) уже прямо прив'язані до WinForms у `_category_.json` — писати їх на WPF було б новим конфліктом.

**Варіант Б — вирівняти все на WPF.**
Переписати теми 21–23 (12 файлів) і всі `_category_.json` для 21–26, а також узгодити з робочою програмою (де прямо написано «Windows Forms», `DataGridView`, `Chart`).
- Ціна: ~1000 рядків тексту переписати + зміна опису тем у програмі (потрібне погодження на рівні кафедри). Теми 24–26 доведеться придумувати заново (у WPF немає `Chart`, немає `DataGridView`, немає Designer у тому ж сенсі).
- Плюс: наявні 8 практикумів і весь `docs/extra/` залишаються без змін; WPF ближчий до сучасної практики.

**Проміжний варіант (мінімальна ціна, якщо переписувати нема часу):** залишити WPF-практикуми як є, але (1) перейменувати їх з «Практичний WPF-додаток» на «Додатково: той самий приклад на WPF», (2) додати перед кожним admonition `:::note` з поясненням, що WPF — інша технологія, її вивчення не входить у програму, і код наводиться «для ознайомлення», (3) додати до кожної з тем 29–33 короткий WinForms-варіант того ж застосунку (по ~120 рядків). Ціна ~600 рядків нового коду.

---

## Тема 32: як розплутати

### Що зараз

| Файл | `sidebar_position` | Заголовок | Реальний зміст | Кому належить за програмою |
|---|---|---|---|---|
| `intro.md` | 1 | Процеси, потоки та клас Thread | Process/Thread, `ThreadStart`, `ParameterizedThreadStart`, Background/Foreground, `Sleep`/`Join`/`Interrupt`, WPF-демо з `Dispatcher` | **32** ✔ |
| `subtopic1.md` | 2 | ThreadPool та Task | `ThreadPool`, `Task.Run`, `Task<T>`, `ContinueWith`, `WhenAll`/`WhenAny`, `TaskStatus`, `AggregateException` | **33** |
| `subtopic2.md` | 3 | async/await | `async/await`, `async void`, `ConfigureAwait`, `HttpClient`, дедлок, `CancellationToken` | **33** |
| `subtopic3.md` | 4 | Практичний WPF-додаток: завантажувач файлів | `Progress<T>`, `HttpClient`, `CancellationToken`, повний WPF | **33** |
| `sync_intro.md` | 5 | Стан гонки та lock | race condition, `lock`, deadlock, `Monitor`, `volatile` | **32** ✔ |
| `sync_subtopic1.md` | 6 | Mutex, Semaphore, ReaderWriterLock | `Mutex`, `Semaphore(Slim)`, `ReaderWriterLockSlim`, TTL-кеш | **32** ✔ |
| `sync_subtopic2.md` | 7 | Interlocked та потокобезпечні колекції | `Interlocked`, `Concurrent*`, `BlockingCollection`, `Immutable*` | **32** ✔ |
| `sync_subtopic3.md` | 8 | Практичний приклад: лічильник та черга | WPF-демо race/lock/Interlocked/BlockingCollection | **32** ✔ |

Порушення STYLE.md: «На тему — 3–5 підрозділів (`intro` + 2–4 `subtopic`)». Зараз 8. Плюс нестандартні імена файлів (`sync_intro.md`, `sync_subtopicN.md`) замість `subtopicN.md`.

### Дублювання між половинами

Прямих дублікатів тексту небагато, але є **три перетини**:

1. **`CancellationToken`** пояснюється в `subtopic2.md` (розділ «CancellationToken: скасування довгої операції» + «CancellationToken у WPF» + «Скасування з таймаутом») і повторно застосовується в `subtopic3.md`. Це нормальне поглиблення, не дубль.
2. **`Interlocked.Increment` для лічильника** з'являється у `sync_subtopic2.md` (розділ «Interlocked.Increment та Decrement», приклад на 10 задач × 100 000) і майже дослівно повторюється у `sync_subtopic3.md` (клас `InterlockedCounter` + панель «З INTERLOCKED», 5 потоків × 100 000). Другий випадок — практикум, тому це виправдано, але вступний абзац у `sync_subtopic3.md` можна скоротити.
3. **Пряме протиріччя між половинами:** `subtopic3.md` вчить «`using var client = new HttpClient();` — **НЕПРАВИЛЬНО**… Призводить до виснаження сокетів», а `sync_subtopic1.md` (клас `RateLimiter`) через кілька файлів пише саме `using var client = new HttpClient();` усередині методу. Те саме повторюється в `topic_33/subtopic2.md` (`TransformBlock` — «Асинхронне завантаження URL»). Три місця, одне з них прямо суперечить власному правилу.

Ще одне протиріччя: `intro.md` і `subtopic3.md` використовують **неволатильні `bool`-прапорці** (`_isCancelled`, `_cancelRequested`) для зупинки фонового потоку — а `sync_intro.md` у розділі «`volatile`: для простих прапорців» пояснює, чому так робити не можна. Тобто тема сама себе спростовує через 2 файли.

### План перерозподілу

**Тема 32 «Основи багатопотоковості та синхронізація потоків» (2 год лекції + 2 год практ.) — 4 файли:**

| Новий файл | Звідки | Пропонована назва |
|---|---|---|
| `intro.md` | нинішній `intro.md` **без** розділу «Приклад WPF: довга операція та Dispatcher.Invoke» (рядки з `<Window x:Class="ThreadingDemo...">` і code-behind) | **Процеси, потоки та клас Thread** |
| `subtopic1.md` | нинішній `sync_intro.md` | **Стан гонки, `lock` і deadlock** |
| `subtopic2.md` | нинішній `sync_subtopic1.md` | **`Monitor`, `Mutex`, `Semaphore`, `ReaderWriterLockSlim`** (перенести сюди розділ «Клас Monitor» із `sync_intro.md`, щоб `subtopic1` не роздувався) |
| `subtopic3.md` | нинішній `sync_subtopic2.md` | **`Interlocked` та потокобезпечні колекції** |
| `practice.md` | створити | Самоперевірка + ДЗ |

Практикум `sync_subtopic3.md` (WPF-демо лічильників) — **або злити з `subtopic3.md`** як фінальний розділ «Практика: три лічильники поруч», **або зробити 5-м файлом**, якщо залишається WPF. Якщо переходити на WinForms — це найпростіший з усіх 8 практикумів для переписування (4 панелі з кнопками і `Label`).

**Тема 33 «Паралельне та асинхронне програмування у .NET» (2 год лекції + 2 год практ.) — перебудувати:**

| Новий файл | Звідки | Пропонована назва |
|---|---|---|
| `intro.md` | нинішній `topic_32/subtopic1.md` | **`ThreadPool`, `Task` і `Task<T>`** (це прямо з опису теми 33: «Поняття задачі (Task), її створення та запуск. Методи Wait, WhenAll, WhenAny») |
| `subtopic1.md` | нинішній `topic_32/subtopic2.md` | **`async`/`await`: асинхронність без блокування потоків** (опис теми 33: «Ключові слова async та await», «Обробка помилок у асинхронних методах», «Відмінності між багатопотоковістю та асинхронністю») |
| `subtopic2.md` | нинішній `topic_33/intro.md` | **Паралельні цикли: `Parallel.For`, `Parallel.ForEach`, `Parallel.Invoke`** |
| `subtopic3.md` | нинішній `topic_33/subtopic1.md` | **PLINQ: паралельний LINQ** |
| `subtopic4.md` | нинішній `topic_33/subtopic3.md` | **Практикум: паралельна обробка зображень** |
| `practice.md` | створити | — |

**Що видалити/винести:**
- `topic_33/subtopic2.md` (**TPL Dataflow**) — цього немає в описі жодної теми програми, це матеріал 3–4 курсу. Перенести в `docs/extra/` як «Додатково: TPL Dataflow» або видалити. Разом із ним зникне і проблема `System.Drawing.Bitmap` (див. нижче).
- `topic_32/subtopic3.md` (**WPF-завантажувач файлів з `HttpClient`**) — це вже не про потоки, а про мережу; логічніше за програмою віддати **темі 35** («Робота з мережею… `HttpClient`… REST API»), яка зараз порожня. Перенести файл туди як готовий практикум.
- WPF-розділ із `topic_32/intro.md` (Dispatcher.Invoke + XAML) — після виносу залишиться чистий консольний вступ про потоки; сам приклад Dispatcher доцільно перенести у нову тему 33 (`subtopic1`), поруч із поясненням `SynchronizationContext`.

**Що дописати після перерозподілу:** у темі 33 бракує прямої відповіді на пункт програми «Розподіл обчислювальних завдань між ядрами процесора» (є неявно в `Parallel.For`) — варто додати короткий розділ з `Environment.ProcessorCount` і законом Амдала (згадка вже є в `topic_33/intro.md`).

---

## Тема 21. Основи використання технології Windows Forms

### Критично

- **Обсяг.** 39 / 43 / 57 / 98 рядків проти норми STYLE.md «250–500 рядків на підрозділ». Тема у 4–5 разів менша за стандарт курсу. Для порівняння, `topic_32/sync_subtopic2.md` має 560 рядків.
- **Немає коду в 3 файлах із 4.** `intro.md`, `subtopic1.md`, `subtopic2.md` — суцільний текст, жодного блоку ```` ```csharp ````. STYLE.md, п.1 «Обов'язкові елементи кожного підрозділу»: «Код. Приклади у блоках ```csharp. Код має компілюватись і бути самодостатнім». Студент за дві години лекції не бачить жодного рядка WinForms-коду, крім одного `MessageBox` у `subtopic3.md`.
- **Немає жодного admonition** у всій темі (норма — 2–4 на підрозділ). Немає жодної таблиці-порівняння. Немає жодної ASCII-схеми, хоча життєвий цикл форми (`Load` → `Shown` → `FormClosing` → `FormClosed`) прямо просить схему — зараз він поданий одним рядком тексту.

### Варто виправити

- `subtopic3.md`, кінець файлу — **порожній блок коду**:
  ```
  ```

  ```
  ```
  Три зайві рядки з відкритою і закритою огорожею без вмісту. Рендериться як порожній сірий прямокутник.
- `subtopic2.md` перелічує властивості форми списком без жодного прикладу коду. Мало б бути `this.Text = "..."; this.StartPosition = FormStartPosition.CenterScreen;` — студент не знає, що `StartPosition` приймає `FormStartPosition`, а не рядок.
- `intro.md`: «З появою платформи .NET Framework у 2002 році… запропонувала нову… модель… Windows Forms». Рік правильний, але далі: «Windows Forms (WinForms) — це платформа розробки… з відкритим вихідним кодом (нині частина .NET Core / .NET 5+)» — варто прямо сказати, що в .NET 8 шаблон називається «Windows Forms App» і працює **тільки на Windows** (`<TargetFramework>net8.0-windows</TargetFramework>`). Зараз цього немає ніде, а студент може створити проєкт із неправильним TFM.
- `subtopic2.md`: `button1.Click += new EventHandler(button1_Click);` — застарілий стиль. STYLE.md вимагає «Сучасність обов'язкова». Сучасно: `button1.Click += Button1_Click;` або лямбда.

### Дрібниці

- `subtopic1.md`: «не підтримує сучасні парадигми на кшталт декларативного розмітки» — граматика («декларативної розмітки»).
- `subtopic1.md`: «DevExpress, Telerik, або відкриті бібліотеки для Material Design» — без посилань; для факультативного читання варто дати хоч одне.
- `subtopic3.md`: «Щоб розширити програму, ви можете додати обробник `TextChanged`… `btnGreet.Enabled = false`» — це готова міні-задача, її місце у `practice.md`.

### Що вже добре

- Логіка викладу правильна: спершу «традиційна модель» і WinAPI, потім WinForms як обгортка, потім структура проєкту (`Form1.cs` / `Form1.Designer.cs` / `Form1.resx`) — це саме те, що вимагає опис теми.
- Попередження «Не рекомендується редагувати цей файл вручну» про `.Designer.cs` — правильне і вчасне.
- Розділ «Стандарти та сучасні тенденції» (UX/UI, `Anchor`/`Dock`, `Accessibility`) повністю закриває відповідний пункт програми і написаний нормально.
- Єдиний повний приклад (`btnGreet_Click`) — коректний, компілюється, з описаним виводом.

---

## Тема 22. Елементи керування та контейнери

### Критично

- **Немає `TabControl`** — хоча в `_category_.json` теми прямо написано «Контейнери GroupBox, Panel, **TabControl**». `TabControl` згадується лише мимохідь у `topic_21/subtopic1.md` («вкладки (TabControl) допомагають структурувати») і в `topic_23/subtopic2.md`, а в темі, де він за програмою мав бути, — жодного слова.
- **Немає розділу про `Anchor` / `Dock`** — «Властивості прив'язки та вирівнювання елементів» з опису теми. Одне речення в `topic_21/subtopic1.md` («активно використовуються властивості `Anchor`… та `Dock`») — це не виклад теми на 2 години.
- Обсяг 73/85/98/109 рядків — знову втричі менше норми. 0 admonitions, 0 таблиць у всіх 4 файлах.

### Варто виправити

- `subtopic2.md`, приклад малювання на `Panel`:
  ```csharp
  using (Graphics g = panel1.CreateGraphics())
  {
      g.DrawLine(Pens.Black, lastPoint, e.Location);
  }
  ```
  **Це антипатерн**, і в лекції він поданий без застереження. Намальоване зникає при першому ж перемальовуванні (зміна розміру, перекриття вікном). Правильний підхід — малювати в `Paint`-обробник по збереженому списку точок або в `Bitmap` + `panel1.BackgroundImage`. Студенти на лабораторній гарантовано напишуть «чому у мене малюнок зникає». Потрібен `:::danger Часта помилка` з поясненням.
- `subtopic1.md`, `DataGridView`: `dataGridView1.Rows.Add("1", "Ноутбук Dell", "25000")` — усі значення рядками, зокрема ціна. Потім сортування по колонці «Ціна» буде лексикографічним («950» > «25000»). Треба або типізовані колонки, або пояснення, чому так не можна.
- `subtopic3.md`: `catch (ArgumentException ex)` навколо блоку, у якому `decimal.TryParse` вже все перевірив, — `ArgumentException` з `CalculateDiscount` кидається лише при `totalAmount < 0`, а `TryParse` від'ємні значення пропускає. Формально працює, але логіка валідації розмазана між формою і сервісом; варто пояснити це явно.
- `subtopic1.md`: «Це зручно для створення екземплярів форм, вміст яких не поміщається на екрані» — беззмістовна фраза, ймовірно збій перекладу («для форм, вміст яких не поміщається»).

### Дрібниці

- `subtopic2.md`: «неохідно встановити форму властивість `KeyPreview = true`» — дві помилки в одному рядку: «необхідно», «для форми властивість».
- `subtopic3.md`: `"Code-behind problem"` у лапках — такого усталеного терміна немає; є «fat view» / «smart UI antipattern».
- `intro.md`: `RichTextBox` описано без єдиного прикладу коду, хоча `SelectionFont`/`SelectionColor` без коду незрозумілі.

### Що вже добре

- `subtopic3.md` («Інтеграція бізнес-логіки») — найсильніший файл теми: правильно пояснює розділення View/Model, показує `DiscountCalculator` як окремий клас, наводить три конкретні наслідки «товстої форми», згадує MVP. Це саме той матеріал, якого зазвичай бракує в курсах WinForms.
- Пояснення `KeyDown` → `KeyPress` → `KeyUp` з `e.Handled = true` — точне і з робочим прикладом фільтрації цифр.
- Пояснення групування `RadioButton` через батьківський контейнер — коректне, з поясненням «навіщо», а не лише «як».

---

## Тема 23. Діалогові вікна, багатовіконні інтерфейси та меню

### Критично

- **Немає меню взагалі.** Опис теми в `_category_.json`: «Меню форми та контекстні меню. Зв'язування меню з елементами інтерфейсу та методами. **Панелі інструментів і рядок стану**». У чотирьох файлах немає жодного `MenuStrip`, `ContextMenuStrip`, `ToolStrip`, `StatusStrip`. `MenuStrip` згадується один раз як побіжна ремарка в `subtopic2.md` («Зазвичай до такої форми додають `MenuStrip`»), а обробник `newDocumentToolStripMenuItem_Click` з'являється в коді без жодного пояснення, звідки він узявся. Це **приблизно 40% обсягу теми за програмою**.
- Обсяг 101/85/76/151 = 413 рядків на 2 години лекції + 2 години лабораторної. 0 admonitions, 0 таблиць.

### Варто виправити

- `subtopic2.md`: `childForm.Text = "Документ " + (this.MdiChildren.Length);` — конкатенація замість інтерполяції, що прямо суперечить STYLE.md («інтерполяція рядків `$"{x}"`»). Плюс логічна вада: `MdiChildren.Length` рахується **до** показу вікна, тому перший документ отримає назву «Документ 0», а після закриття середнього вікна назви почнуть повторюватись. Потрібен окремий лічильник.
- `subtopic2.md`: «батьківська форма має **статичний метод** `LayoutMdi`» — `LayoutMdi` є **екземплярним** методом (`this.LayoutMdi(...)`, як і в самому прикладі нижче). Помилка у тексті прямо суперечить власному коду через два рядки.
- `subtopic3.md`, спосіб 3 (події): `palette.ColorChanged += Palette_ColorChanged;` — підписка є, **відписки немає**. Для немодального вікна, яке відкривається багаторазово, це витік пам'яті й накопичення обробників. Потрібна згадка про `-=` у `FormClosed`.
- `subtopic1.md`: рекомендується `using (SettingsForm settingsForm = new SettingsForm())` — правильно, але не пояснено **чому** саме тут `using` обов'язковий (після `ShowDialog()` форма не знищується автоматично, на відміну від `Show()`), і що читати `settingsForm.ConfigName` треба **до** виходу з `using`. У `subtopic3.md` це вже роблять правильно, але зв'язок між файлами не проговорено.
- `intro.md`, `Filter`: у тексті властивостей написано `"Текстові файли (_.txt)|_.txt|Всі файли (_._)|_._"` — зірочки з'їдені Markdown-курсивом (`*.txt` → `_.txt`). У блоці коду нижче фільтр правильний. Треба взяти рядок у backticks.

### Дрібниці

- `subtopic2.md`: «приклад: старі версії Microsoft Excel чи Adobe Photoshop» — Photoshop ніколи не був MDI у класичному сенсі; краще приклад Microsoft Access або Delphi IDE.
- `subtopic3.md`: «Опанувавши вищенаведені три способи взаємодії, ви зможете будувати гнучкі та архітектурно правильні застосунки з будь-якою кількістю і складністю вікон» — канцелярит, STYLE.md просить «без канцеляриту».

### Що вже добре

- Три способи передачі даних між формами (конструктор / властивості / події) з правильним поясненням, **коли який** — це сильний і рідкісний за якістю розділ.
- Пояснення `DialogResult` на кнопках («Ніякого додаткового коду для події `Click` писати не потрібно!») — саме та деталь, яку студенти зазвичай не знають і пишуть зайвий код.
- `AcceptButton` / `CancelButton` — доречно і коротко.
- Порівняння SDI / MDI / TDI з реальними прикладами програм — добра орієнтація в предметі.

---

## Тема 29. Робота з форматами даних: XML та JSON

### Критично

- **Помилка в коді, `intro.md`, розділ «Завантаження XML»** — змінна `doc` оголошена двічі в одному блоці:
  ```csharp
  // З файлу
  XDocument doc = XDocument.Load("library.xml");

  // З рядка (для тестів)
  string xml = "<root><item>Hello</item></root>";
  XDocument doc = XDocument.Parse(xml);
  ```
  `CS0128: A local variable named 'doc' is already defined in this scope`. Треба або два різні імена, або коментар «або так».
- **Неправильний заявлений вивід, `subtopic1.md`.** Код `new XAttribute("active", true)` — LINQ to XML серіалізує `bool` через `XmlConvert`, тобто в **нижньому** регістрі: `active="true"`. У лекції показано:
  ```xml
  <student id="1" active="True">
  ```
  Помилка тягне за собою другу — приклад видалення нижче шукає саме `"False"`:
  ```csharp
  .Where(s => (string)s.Attribute("active") == "False")
  ```
  Цей код **не видалить нічого**, бо у файлі буде `active="false"`. Студент отримає «нічого не працює» без жодної помилки компіляції — найгірший тип бага для навчального матеріалу.
- **Фактична помилка, `subtopic2.md`:** «Починаючи з **.NET 3.0**, стандартна бібліотека включає `System.Text.Json`». Версії «.NET 3.0» не існує. `System.Text.Json` з'явився у **.NET Core 3.0** (2019) і входить у .NET 5+. Формулювання плутає студента з .NET Framework 3.0 (2006).

### Варто виправити

- `subtopic3.md`, `OnEditorChanged` — коментар прямо суперечить коду:
  ```csharp
  private void OnEditorChanged(object sender, TextChangedEventArgs e)
  {
      // Ігноруємо зміни під час програмного заповнення полів
      if (_active == null) return;
      _dirty = true;
  }
  ```
  У `OnNoteSelected` спершу виконується `_active = note;`, і **тільки потім** `TitleBox.Text = note.Title;`. Тобто на момент спрацювання `TextChanged` `_active` вже не `null` — прапорець «ігнорування» не працює. Наслідок: щойно користувач клікає по нотатці, вона миттєво позначається як «змінена», і при переході на іншу він отримує запит «Є незбережені зміни». Треба окремий прапорець `_loading` (`_loading = true; ... _loading = false;`).
- `subtopic3.md`, заявлений XML-вивід: `exportedAt="2024-03-15T11:30:00.000+02:00"` — формат `"o"` для `DateTime` з `Kind = Local` дає **сім** знаків після коми: `2024-03-15T11:30:00.0000000+02:00`. Нижче у тому ж файлі `createdAt` показаний правильно (`...00.0000000`), тобто вивід сам собі суперечить.
- `subtopic3.md`: застосунок називається «менеджер нотаток», але `DownloadSingleAsync`-подібної перевірки унікальності `_nextId` після видалення немає — після видалення останньої нотатки й перезапуску `_nextId` перерахується правильно, але в межах сесії id можуть повторитись. Дрібно, але це саме той клас багів, який студенти потім не можуть знайти.
- Опис теми в `_category_.json` містить «**Схеми XML та валідація**» і «робота з **REST API**». Ні `XmlSchemaSet`/`XDocument.Validate`, ні жодного HTTP-запиту в темі немає. `XSD` згадано одним словом у підсумковій таблиці («Схема валідації | XSD, DTD | JSON Schema») — це не виклад. Дві прогалини проти програми.
- `subtopic1.md`: `XmlSerializer` — не сказано, що в реальному виводі з'являться `xmlns:xsi` та `xmlns:xsd` на кореневому елементі, і як їх прибрати (`XmlSerializerNamespaces`). Студент побачить не той XML, який очікував.

### Дрібниці

- `intro.md`, приклад `Descendants`: `<section name="science"><book><title>Кобзар</title>` — «Кобзар» у секції «наука». Комічно і відволікає.
- `subtopic2.md`: у блоці ```` ```json ```` використано коментар `// JSON — компактніший`. JSON не підтримує коментарі — і про це прямо сказано в підсумковій таблиці («Коментарі | Підтримує | Не підтримує»). Самосуперечність.
- `subtopic3.md`: `RefreshList()` викликає `NotesList.Items.Clear()`, що породжує подію `SelectionChanged` → `OnNoteSelected` → можливе непотрібне перезаписування полів. Працює, але крихко.

### Що вже добре

- Порівняльна таблиця `XDocument` vs `XmlSerializer` з чітким «Правилом вибору» («Читаємо **чужий** XML → `XDocument`; Зберігаємо **свої** об'єкти → `XmlSerializer`») — точно і практично.
- Підсумкова таблиця XML vs JSON по 9 критеріях — одна з найкращих у курсі.
- `JsonDocument` з `TryGetProperty` і admonition про `IDisposable` — правильно і актуально.
- Використання raw string literals (`"""`) для JSON у `subtopic2.md` — сучасний C# 11, як і вимагає STYLE.md.
- Розділи «Обробка помилок» у обох підрозділах з конкретними типами винятків (`XmlException.LineNumber`, `JsonException.Path`) — саме те, що потрібно новачкам.

---

## Тема 30. Основи роботи з базами даних у C#

### Критично

- **Дублювання всередині теми.** `subtopic1.md` і `subtopic3.md` викладають три одні й ті самі підтеми:

  | Підтема | `subtopic1.md` | `subtopic3.md` |
  |---|---|---|
  | Транзакції | розділ «Транзакції» + метод `TransferGrade` | розділ «Транзакції» + метод `AddStudentWithGrades` |
  | Зв'язки і JOIN | розділ «Зв'язки між таблицями (JOIN)» + `GetAllWithGroup()` | розділ «Зв'язки між таблицями» + `GetAllWithGroup()` |
  | Масова вставка | «Масова вставка (batch insert)» + `AddMany()` | «Транзакція для масової вставки» + `BulkInsert()` |

  Методи `AddMany` і `BulkInsert` **ідентичні по тілу** (той самий `cmd.Parameters.Add("$n", SqliteType.Text)`, той самий цикл, той самий `tx.Commit()`), відрізняються лише назвою. `GetAllWithGroup` присутній двічі з дрібною різницею (кортеж vs `record StudentWithGroup`). Рекомендація: прибрати ці три розділи з `subtopic1.md` (залишити там тільки чистий CRUD-репозиторій), а `subtopic3.md` залишити як «Зв'язки та транзакції».

- **Суперечливі числа в одному й тому ж твердженні.**
  `subtopic1.md`: «вставка 1000 рядків займе ~10 секунд. З транзакцією — **менше секунди**».
  `subtopic3.md`: «1000 вставок без транзакції ≈ 5–10 секунд. З транзакцією — **менше 100 мс**».
  Дві різні цифри для одного експерименту в одній темі.

- **Код, що впаде при запуску.** `subtopic3.md`, `AddStudentWithGrades`:
  ```csharp
  gradeCmd.CommandText = "INSERT INTO grades (student_id, value) VALUES ($sid, $val)";
  ```
  Таблиця `grades` **ніде не створюється** — ні в `EnsureCreated()` цього ж файлу (там `groups` і `students`), ні раніше. Студент, що скопіює приклад, отримає `SqliteException: no such table: grades`. Або додати `CREATE TABLE grades`, або змінити приклад.

### Варто виправити

- **Неправильні номери тем** у `intro.md` — два місця:
  ```
  Вищий рівень    │   Entity Framework Core  │  ← (Тема 24: ORM)
  ```
  і «Розуміння ADO.NET є необхідною базою перед вивченням ORM (Entity Framework Core у **Темі 24**)». EF Core — це **Тема 31**. Залишок від старої нумерації.
- `intro.md`: `long count = (long)cmd.ExecuteScalar();` — у .NET 8 із увімкненими nullable reference types `ExecuteScalar()` повертає `object?`, тому пряме розпакування дасть попередження, а при порожній таблиці `SELECT MAX(...)` поверне `DBNull.Value` і кине `InvalidCastException`. Нижче у тому ж файлі про `DBNull` сказано правильно — але лише для `MAX`, не для патерну загалом.
- Опис теми в `_category_.json`: «Архітектура ADO.NET: з'єднання (**SqlConnection**), виконання команд (**SqlCommand**), зчитування результатів (**SqlDataReader**)» і «на прикладі **SQL Server** або SQLite». У матеріалі є тільки `SqliteConnection` / `SqliteCommand` / `SqliteDataReader`. Класи `SqlConnection`/`SqlCommand`/`SqlDataReader` (`Microsoft.Data.SqlClient`) не згадуються **жодного разу**. Потрібен хоча б один абзац «ті самі класи для SQL Server називаються так» + таблиця відповідності, інакше формально тема програми не покрита.
- `subtopic1.md`, приклад транзакції `TransferGrade(int fromId, int toId, int points)` — «переказ балів між студентами» як метафора банківського переказу. Для оцінок це семантично безглуздо і може закріпити хибну модель. Краще взяти справжній переказ коштів або переміщення товару між складами.
- `subtopic1.md` створює таблицю `students` **без** колонки `email` у прикладі з JOIN, тоді як `MapStudent` (який використовується у `GetAllWithGroup`) читає `r.GetOrdinal("email")`. Запит у прикладі `email` вибирає, тож працює, але дві різні схеми `students` в одному файлі збивають з пантелику.

### Дрібниці

- `subtopic2.md`: `Search`/`GetAll` конкатенують `%` у значення параметра (`$"%{search}%"`) — це правильно, але варто пояснити, що спецсимволи `%` і `_` у введеному тексті не екрануються, тож пошук «50%» дасть несподіваний результат.
- `intro.md`, схема «Рівні абстракції» — добра, але Entity Framework Core названий «Вищий рівень», а нижче стрілка вказує на «Тема 24». Після виправлення номера — все гаразд.
- `subtopic2.md` (WPF) — `Refresh()` перечитує всю таблицю на **кожне натискання клавіші** у `SearchBox`. Для навчального прикладу прийнятно, але варто додати `:::tip` про debounce.

### Що вже добре

- Розділ про SQL-ін'єкції з `:::danger` і прикладом `"'; DROP TABLE students; --"` — точний, короткий, із правильним поясненням «параметри передаються окремо від SQL-тексту».
- Вибір **SQLite** (а не LocalDB) для навчального курсу — правильне рішення: студенту не треба нічого встановлювати.
- Використання raw string literals (`"""`) для багаторядкового SQL — сучасно і читабельно.
- Патерн Repository поданий із поясненням «навіщо» і зі схемою `MainWindow → StudentRepository → SqliteConnection`.
- Таблиця «Що вивчили» наприкінці `subtopic3.md` (концепція → інструмент) — добра точка збірки.

---

## Тема 31. Entity Framework та ORM

### Критично

- **Неправильні номери тем** у підсумковій таблиці `subtopic3.md`:
  ```
  | | ADO.NET (Тема 23) | EF Core (Тема 24) |
  ```
  Має бути «Тема 30» і «Тема 31». Третє місце в курсі з тією самою помилкою старої нумерації (два інші — в `topic_30/intro.md`).
- **Самосуперечність у `intro.md`.** Таблиця правил перетворення:
  | `string` (не nullable) | `TEXT NOT NULL` |
  Через 20 рядків, у прикладі з атрибутами:
  ```csharp
  [Required]            // NOT NULL (для string — за замовчуванням nullable)
  ```
  У .NET 8 із увімкненими nullable reference types (шаблон за замовчуванням) не-nullable `string` **уже** мапиться в `NOT NULL` — саме як у таблиці. Коментар описує поведінку EF Core при **вимкнених** NRT. Один із двох фрагментів неправильний, залежно від налаштувань проєкту, і це ніде не проговорено.
- **Неправильний коментар для обраної СУБД.** `intro.md`: `[MaxLength(200)] // VARCHAR(200)`. Уся тема працює через `UseSqlite(...)`, а SQLite **не має типу `VARCHAR(200)`** — стовпець буде `TEXT`, і обмеження довжини на рівні БД не з'явиться взагалі. Студент вважатиме, що БД його захищає, а це не так.

### Варто виправити

- `intro.md`, `OnModelCreating`:
  ```csharp
  modelBuilder.Entity<Student>().Property(s => s.CreatedAt).HasDefaultValueSql("datetime('now')");
  ```
  і одночасно в моделі:
  ```csharp
  public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
  ```
  Ініціалізатор у C# гарантує, що значення **ніколи не буде CLR-дефолтним**, тому `HasDefaultValueSql` не спрацює жодного разу. Треба показати або одне, або друге, з поясненням «default у БД працює лише коли властивість має значення за замовчуванням типу».
- `intro.md`: `HasIndex(s => s.Email).IsUnique()` для `string? Email` — у SQLite кілька `NULL` в унікальному індексі дозволені, у SQL Server (без фільтрованого індексу) — ні. Для теми, що обіцяє «підтримує SQLite, PostgreSQL, SQL Server», це варте примітки.
- `subtopic1.md`, «Логування SQL»: у прикладі виводу параметри показані як `[Parameters=[$name='Олена' ...]]`, а сам SQL — з `@p0, @p1, @p2`. Реальний вивід EF Core використовує `@p0` в обох місцях. Заявлений вивід не відповідає дійсності.
- `subtopic1.md`: `.LogTo(Console.WriteLine, LogLevel.Information)` — `LogLevel` живе в `Microsoft.Extensions.Logging`, відповідного `using` у прикладі немає. Код не скомпілюється як є.
- `subtopic2.md`, «Запис студента на курс»:
  ```csharp
  var student = db.Students.Find(1);
  var course  = db.Courses.Find(3);
  db.Enrollments.Add(new Enrollment { StudentId = student.Id, CourseId = course.Id });
  ```
  `Find` повертає `Student?`; `student.Id` без перевірки на `null` дасть попередження CS8602 і `NullReferenceException`, якщо запису немає. У сусідніх прикладах цього ж файлу перевірка `if (student != null)` є — тобто стиль непослідовний.
- **Database First покрито одним реченням**: «Альтернатива — **Database First** (зворотне: починаємо з існуючої БД, генеруємо класи). У нових проектах переважає Code First». Опис теми в `_category_.json` виносить «Підходи Code First **та Database First**» в один ряд. Потрібен хоча б розділ на 20–30 рядків із `dotnet ef dbcontext scaffold "Data Source=..." Microsoft.EntityFrameworkCore.Sqlite -o Models` і поясненням, коли це потрібно (успадкована БД).
- `subtopic3.md` (WPF-практикум) тримає **один `AppDbContext` на весь час життя вікна** (`private readonly AppDbContext _db = new();`). Це прямо суперечить рекомендованій практиці EF Core (короткоживучий контекст) і призводить до розростання change tracker. У `Refresh()` це компенсовано `AsNoTracking()`, але сам патерн подано без жодного застереження — студент понесе його далі.

### Дрібниці

- `subtopic2.md`, `HasData` — правильне попередження про обов'язковий `Id`, але не сказано, що `HasData` працює через міграції, а з `EnsureCreated()` (який використовує практикум) seed теж застосовується лише при **першому** створенні файлу БД. Студент змінить seed, перезапустить і не побачить змін.
- `subtopic1.md`: `db.Students.Average(s => s.Grade)` на порожній таблиці кине `InvalidOperationException` — у прикладах агрегатів це не згадано, хоча в темі 30 аналогічна проблема з `DBNull` описана.

### Що вже добре

- `ExecuteDelete()` / `ExecuteUpdate()` (EF Core 7+) — сучасний API, показаний правильно, з коментарем «без завантаження в пам'ять». Мало який курс це дає.
- Розділ «Change Tracking» із конкретною демонстрацією, що EF генерує `UPDATE` лише для зміненого поля — пояснює «як воно працює під капотом», як вимагає STYLE.md.
- Таблиця `OnDelete`-поведінок (`SetNull` / `Cascade` / `Restrict` / `NoAction`) — коротка й повна.
- Many-to-many в обох варіантах (автоматична проміжна таблиця EF Core 5+ і явна сутність `Enrollment` із додатковими полями) — правильна повнота.
- Порівняльна таблиця ADO.NET vs EF Core з рядком «Коли обирати» («90% звичайних проектів») — чесна і практична.

---

## Тема 32. Основи багатопотоковості та синхронізація потоків

(див. також окремий розділ «Тема 32: як розплутати»)

### Критично

- **Тема сама себе спростовує (прапорці).** `intro.md` (`FileDownloader._isCancelled`) і `intro.md`/WPF-демо (`_cancelRequested`) використовують звичайний `bool`, який пишеться з UI-потоку і читається у фоновому:
  ```csharp
  private bool _isCancelled;
  ...
  if (_isCancelled) { ... return; }
  ```
  Через три файли, у `sync_intro.md`, розділ «`volatile`: для простих прапорців» пояснює, що без `volatile` потік може читати закешоване значення і не побачити зміни. Тобто вступний приклад теми демонструє рівно той баг, який тема потім вчить не робити — і ніде на це не вказано. Або додати `volatile`, або (краще) одразу показати `CancellationToken`.
- **Пряме протиріччя з `HttpClient`.** `subtopic3.md`:
  ```csharp
  // НЕПРАВИЛЬНО:
  using var client = new HttpClient(); // Новий екземпляр на кожен запит!
  // Призводить до виснаження сокетів (socket exhaustion)
  ```
  `sync_subtopic1.md`, клас `RateLimiter`:
  ```csharp
  public async Task<string> CallExternalApiAsync(string url)
  {
      await _throttle.WaitAsync();
      try { using var client = new HttpClient(); return await client.GetStringAsync(url); }
  ```
  Те саме повторено в `topic_33/subtopic2.md` (`TransformBlock` — «Асинхронне завантаження URL»). Три порушення власного правила.
- **XAML не скомпілюється.** `sync_subtopic3.md`, «Рядок порівняння»:
  ```xml
  <StackPanel Orientation="Horizontal" HorizontalAlignment="Center" Spacing="24">
  ```
  У **WPF** у `StackPanel` немає властивості `Spacing` — це API WinUI/UWP/Avalonia. Компіляція XAML впаде з `The property 'Spacing' was not found in type 'StackPanel'`. Треба прибрати і задати `Margin` на дочірніх `TextBlock`.

### Варто виправити

- `sync_subtopic2.md`, `ImmutableDemo`:
  ```csharp
  private static volatile ImmutableDictionary<string, string> _config = ...;
  ...
  } while (Interlocked.CompareExchange(ref _config!, updated, original) != original);
  ```
  Передача `volatile`-поля по `ref` дає **CS0420** («a reference to a volatile field will not be treated as volatile») — компілятор прямо попереджає, що семантика `volatile` тут втрачається. Це антипатерн, поданий як зразок. Правильно: прибрати `volatile` (у `Interlocked` вже є бар'єри) або використати `Volatile.Read`.
- `sync_subtopic2.md`, зведена таблиця колекцій: рядок `ImmutableList<T> / ImmutableDictionary<K,V>` має в колонці «Async» значення «**Так**». Незмінні колекції не мають жодного асинхронного API. Помилка в таблиці.
- `sync_subtopic2.md`, `ConcurrentQueueDemo`:
  ```csharp
  var producers = Enumerable.Range(1, 3).Select(id => Task.Run(() => {...}));
  ...
  Task.WaitAll([..producers, consumer]);
  ```
  `Select` **ледачий** — задачі-виробники фактично стартують лише в момент розгортання `[..producers]`, тобто **після** створення споживача. Працює, але з крихкою і неочевидною для студента семантикою; при повторному перерахуванні послідовності задачі створилися б удруге. Потрібен `.ToArray()` одразу після `Select`. Та сама пастка у `sync_subtopic1.md` (`ConnectionPoolDemo`, `var tasks = Enumerable.Range(1, 8).Select(...)`).
- `sync_subtopic3.md`, `InitTaskQueue` використовує `Dispatcher.BeginInvoke(() => ...)` з лямбдою. Перевантаження `BeginInvoke(Action)` — це метод-розширення з `System.Windows.Threading.DispatcherExtensions`, а в списку `using` цього файлу є тільки `System.Windows` і `System.Windows.Controls`. Не скомпілюється без `using System.Windows.Threading;`.
- `sync_subtopic3.md`: стан завдань визначається **парсингом рядка UI**:
  ```csharp
  int completed = viewModels.Count(vm => vm.StatusText.StartsWith("Завершено"));
  ```
  (аналогічно в `subtopic3.md`). Це поганий приклад архітектури в темі, яка сама вчить розділяти дані й представлення. Треба enum-поле стану.
- `intro.md`: `bool finished = worker.Join(5000);` викликано **після** `worker.Join()` — мертвий код, завжди поверне `true` миттєво. Треба або показати це на іншому потоці, або закоментувати як «альтернатива».
- `intro.md`: «`Thread.Abort()` застарів (обмежений у .NET 5+, недоступний у .NET Core)» — суперечливе формулювання (.NET 5 і є продовженням .NET Core). Точно: у .NET Core / .NET 5+ `Thread.Abort()` кидає `PlatformNotSupportedException`.
- `sync_subtopic1.md`: «`WaitAsync()` лише призупиняє **coroutine**» — у C# немає корутин. Треба «призупиняє асинхронний метод (машину станів), не блокуючи потік».
- `sync_subtopic1.md`: «`lock`… набагато швидший (мікросекунди проти мілісекунд)» — неоспорений `Monitor.Enter` коштує десятки **наносекунд**, `Mutex` — одиниці мікросекунд. Порядки завищено на 3.
- `sync_subtopic1.md`, `TtlCache` — у прикладі використання викликається `Parallel.For`, але серед `using` файлу є лише `System`, `System.Collections.Generic`, `System.Threading`. `Parallel` живе в `System.Threading.Tasks` — не скомпілюється.

### Дрібниці

- `sync_intro.md`, приклад із касирами: «Результат: 10 грн (а не -70, хоча грошей не вистачало!)» — фраза «а не -70» незрозуміла; сенс у тому, що обидва зняття пройшли, хоча сумарно 170 > 100.
- `sync_subtopic2.md`, `LazyInitExample`: змінна `var previous = Interlocked.CompareExchange(...)` присвоюється і **ніде не використовується** (далі повертається `_expensiveResource!`), хоча коментар нижче говорить «Якщо `previous != null` — інший потік вже встиг…». Або використати, або прибрати.
- `sync_subtopic2.md`: рядок таблиці «`ConcurrentBag<T>` | Аналог `List<T>`» — `ConcurrentBag` не є аналогом `List<T>` (немає індексації, немає порядку).
- `subtopic1.md`: `Task<int> faultyTask = Task.Run(() => { throw ...; return 42; });` — недосяжний `return` дає попередження CS0162; коментар це визнає, але краще прибрати.

### Що вже добре

- `sync_intro.md` — **найсильніший файл усього другого семестру**. Аналогія з двома касирами, покрокова схема гонки, розбір `_counter++` на три мікрооперації, розгортка `lock` у `Monitor.Enter/Exit` з `lockTaken`, повний і правильний перелік «що не можна брати як об'єкт блокування» (`this`, рядковий літерал з поясненням про інтернування, `typeof`) — це рівень якісної книги, а не конспекту.
- Producer-consumer через `Monitor.Wait`/`Pulse` з правильним `while`-циклом (а не `if`) і прапорцем `_finished` — канонічно правильна реалізація.
- Порівняльна таблиця примітивів синхронізації по 6 критеріях — дуже добра.
- `ReaderWriterLockSlim` з `EnterUpgradeableReadLock` і double-check всередині — рідко зустрічається в навчальних матеріалах і подано коректно.
- Візуалізація дедлоку `.Result` у WPF (ASCII-схема «НІКОГО НЕ ВІДПУСКАЮТЬ») у `subtopic2.md` — дуже наочно.
- Пояснення `Progress<T>` через `SynchronizationContext` і порівняння з `Dispatcher.Invoke` — правильне і практичне.

---

## Тема 33. Паралельне та асинхронне програмування у .NET

### Критично

- **Тема не відповідає власному опису.** `_category_.json`: «Поняття задачі (Task), її створення та запуск. Методи Wait, WhenAll, WhenAny… Ключові слова **async та await**… Обробка помилок у асинхронних методах. Відмінності між багатопотоковістю та асинхронністю». Жодного з цих пунктів у темі 33 **немає** — усі вони в `topic_32/subtopic1.md` і `topic_32/subtopic2.md`. Натомість тема містить `Parallel` (є в описі), PLINQ (немає в описі) і **TPL Dataflow** (немає в описі, матеріал старших курсів). Див. план перерозподілу вище.
- **Вигадані вимірювання.** `intro.md`, порівняння `foreach` vs `Parallel.ForEach`:
  ```csharp
  int[] inputs = Enumerable.Range(30, 1000).ToArray();  // 1000 чисел Фібоначчі
  ...
  // Sequential: 142 мс
  // Parallel:    23 мс  (≈6x прискорення)
  ```
  `Fib` тут **ітеративна** (цикл до `n`), n ≤ 1029, 1000 викликів → близько 10⁶ найпростіших операцій, тобто **одиниці мілісекунд**, а не 142. При такому обсязі роботи `Parallel.For` за накладними витратами буде **повільнішим**, а не у 6 разів швидшим — рівно те, про що попереджає сусідній розділ «Коли НЕ варто використовувати Parallel». Приклад демонструє протилежне тому, що заявлено, і студент на лабораторній цього не відтворить. Потрібно або взяти рекурсивну `Fib`, або n ≈ 10⁵ елементів із важчою роботою.
- **`System.Drawing` без застережень.** `subtopic2.md` (`using System.Drawing; using System.Drawing.Imaging;`, `new Bitmap(filePath)`) і `subtopic3.md` (те саме + `ApplyGaussianBlur`). У .NET 8 `System.Drawing.Common`:
  (а) **не входить** у стандартні бібліотеки — потрібен NuGet-пакет, про який ніде не сказано;
  (б) підтримується **тільки на Windows** — на інших ОС кидає `PlatformNotSupportedException` (з .NET 6).
  Для теми, що пропонує це як основний практикум, потрібен окремий `:::warning` і рядок `dotnet add package System.Drawing.Common`. Альтернатива — `SixLabors.ImageSharp` або взагалі відмовитись від зображень.

### Варто виправити

- `subtopic3.md`, `ApplyGaussianBlur` використовує `GetPixel`/`SetPixel` у чотирьох вкладених циклах. Це найповільніший спосіб роботи з `Bitmap` у .NET (блокування/розблокування на кожен піксель) — для зображення 1920×1080 з радіусом 2 це ~2·10⁶ викликів GDI+ на файл. У темі **про продуктивність** такий приклад іронічний: студент отримає секунди на кадр і не побачить ефекту від паралелізму на рівні пікселів. Потрібен хоча б `:::warning` із згадкою `LockBits`/`WriteableBitmap`.
- `subtopic3.md`: послідовний режим (`OnSequential_Click`) **не приймає `CancellationToken`** — кнопка «Скасувати» під час послідовної обробки не працює, хоча UI цього ніяк не показує (`BtnCancel` вмикається лише в паралельному режимі, але користувач цього не знає). Або додати токен, або явно сказати в тексті.
- `subtopic3.md`: `_cts.Dispose(); _cts = null;` у `finally`, при тому що `OnCancel_Click` робить `_cts?.Cancel()` з UI-потоку — між перевіркою `?.` і викликом можлива `ObjectDisposedException`. Та сама схема у `topic_32/subtopic2.md` і `topic_32/subtopic3.md`. Потрібне пояснення або локальна копія.
- `subtopic2.md`, `DataflowBlockOptions` — коментар не відповідає полю:
  ```csharp
  // Мінімальна кількість елементів для запуску обробки (оптимізація пакетної обробки)
  // EnsureOrdered = true  — зберігати порядок виходу (за замовчуванням true)
  EnsureOrdered = false
  ```
  Перший рядок коментаря описує щось інше (`BatchBlock`?) і залишився від попередньої редакції.
- `subtopic2.md`, «LinkTo: з'єднання блоків»:
  ```csharp
  source.LinkTo(evenSink, linkOptions, n => n % 2 == 0);
  source.LinkTo(oddSink,  linkOptions, n => n % 2 != 0);
  source.LinkTo(discardSink);  // "Якщо жоден фільтр не підходить — інакше блок завис би"
  ```
  Два предикати вичерпують усі значення, тому `NullTarget` тут не потрібен — коментар пояснює важливу річ на прикладі, де вона не потрібна. Плюс у циклі надсилається `source.Post(i * i)`, а сам блок робить `n => n * n`, тобто на виході — четверті степені; сенс прикладу губиться.
- `subtopic1.md`: «Звичайний `Aggregate` **не можна** паралелізувати — він послідовний за природою» — надто категорично; асоціативний акумулятор паралелізується, про що сам розділ далі й розповідає.
- `subtopic3.md`: підсумкова таблиця містить рядок **`Channel<T>`** («Producer-consumer, стрімінг даних»), хоча `Channel<T>` у курсі **ніде не викладається**. Або додати короткий розділ (це природна заміна `BlockingCollection` в async-коді), або прибрати з таблиці.
- Кольори: у `subtopic3.md` акцент заданий як `#cba4f7`, тоді як в усіх інших практикумах курсу (Catppuccin Mauve) — `#cba6f7`. Дрібниця, але помітна при перегляді сторінок поспіль.

### Дрібниці

- `subtopic1.md`: «`Handle` може обробити кожен **вняток** окремо» — друкарська помилка.
- `subtopic1.md`, `IsPrime`: `for (long i = 2; i <= Math.Sqrt(n); i++)` — `Math.Sqrt(n)` перераховується на кожній ітерації. У темі про продуктивність варто винести в змінну.
- `subtopic1.md`, `HeavyTransform`: `Math.Sqrt(Math.Sin(x)*Math.Sin(x) + Math.Cos(x)*Math.Cos(x)) * x` тотожно дорівнює `x`. Смішно, але як «імітація CPU-навантаження» — прийнятно; варто додати коментар, що результат навмисно тривіальний.
- `subtopic3.md`: `LogText.Text += ...` на кожен оброблений файл — квадратична складність конкатенації рядків; для 500 файлів помітно підвісить UI.

### Що вже добре

- Розділ «Паралелізм vs Конкурентність» з двома ASCII-діаграмами і таблицею — найкраще пояснення цієї різниці в курсі, і саме воно закриває пункт програми «Відмінності між багатопотоковістю та асинхронністю».
- `Break()` vs `Stop()` із таблицею гарантій — тонка деталь, яку зазвичай пропускають.
- `Parallel.ForEach` із `localInit`/`localFinally` та `Interlocked.Add` — правильний канонічний патерн агрегації без гонок.
- Розділ «Коли НЕ варто використовувати Parallel» із трьома чіткими умовами — важливий і рідкісний.
- `AsOrdered()` із поясненням ціни, `WithDegreeOfParallelism`, `WithCancellation`, `ForAll` — PLINQ покрито повно і правильно.
- Фінальна таблиця «Інструмент / Рівень / Коли використовувати / Коли уникати» і «Золоте правило» («Питайте себе: чому задача повільна?») — відмінна точка збірки для всього блоку 32–33.

---

## Порожні теми

- **Тема 24. Робота з подіями та складними елементами керування** — є лише `_category_.json`; матеріалу немає (2 лек. + 2 лаб.).
- **Тема 25. Робота з колекціями та DataGridView. Звітність** — є лише `_category_.json` (2 лек. + 2 лаб.).
- **Тема 26. Двовимірна графіка та візуалізація даних** — є лише `_category_.json` (2 лек. + 2 лаб.).
- **Тема 27. Рядки та регулярні вирази** — є лише `_category_.json` (2 лек. + 2 практ. + 2 лаб.).
- **Тема 28. LINQ і запити до даних** — є лише `_category_.json` (2 лек. + 2 практ. + 2 лаб.).
- **Тема 34. Збірки, бібліотеки, ресурси та локалізація. Безпека і конфігурація** — є лише `_category_.json` (2 лек.).
- **Тема 35. Робота з мережею. Розгортання застосунків та архітектура клієнт/сервер** — є лише `_category_.json` (2 лек. + 2 практ.).

Разом: **7 порожніх тем із 15**, тобто ~47% другого семестру. Порожня категорія в Docusaurus із `generated-index` рендериться як сторінка-заглушка без жодного посилання — для студента це виглядає як зламаний сайт.

Примітка: тема 26 у `_category_.json` обіцяє «елементи **Chart**». Класичний `System.Windows.Forms.DataVisualization.Charting.Chart` **не перенесений у .NET Core/.NET 5+** і в .NET 8 недоступний. Перед написанням теми 26 треба обрати заміну (ScottPlot, LiveCharts2, OxyPlot або власне малювання GDI+) і, можливо, скоригувати опис теми.

---

## Вступ до курсу (`docs/intro.md`)

### Помилки в числах

| Зараз у файлі | Має бути за новою програмою |
|---|---|
| «У 1 семестрі передбачено **7 лабораторних робіт**» | **17 лабораторних** і **11 практичних** робіт |
| «У 2 семестрі виконуємо **13 лабораторних робіт**» | **11 лабораторних** і **6 практичних** робіт |
| «Усього за курс — **20 лабораторних робіт**» | **28 лабораторних** і **17 практичних** робіт |
| практичні роботи не згадані **жодного разу** | окремий вид занять, потребує окремого рядка |

### Критично (не тільки числа)

- **Перелічені не ті мови.** Розділ «Що таке алгоритмічні мови?»:
  > «У межах цього курсу ми ознайомимося з такими мовами: **Python** — … **C++** — … **Java** — …»

  Курс викладається **виключно на C#/.NET** (STYLE.md: «Технології — C# 12 / .NET 8, Visual Studio 2022»; усі 35 тем — C#). **C# у цьому переліку взагалі відсутній.** Це найгрубіша фактична помилка на головній сторінці курсу. Замінити на C# із поясненням, чому саме він, і додати одне речення про те, що принципи переносяться на інші мови.
- **Зламане форматування.** Рядки 16–17:
  ```
  ...зосередимось на **графічному інтерфейсі (GUI)** та *
    *бізнес-логіці застосунків**.
  ```
  Розрив `**` між рядками — Markdown не склеїть жирний текст, на сторінці буде видно голі зірочки (` * *бізнес-логіці застосунків** `). Треба переписати в один рядок.
- **Опис змісту курсу не відповідає курсу.** Розділ «Основні теми курсу ОПАМ» перелічує «Основи алгоритмів та структур даних / Базові конструкції / Розробка та налагодження / Основи ООП / **Аналіз алгоритмів**». У реальному курсі є ще GUI (теми 21–26), рядки й regex (27), LINQ (28), XML/JSON (29), бази даних і EF Core (30–31), багатопотоковість (32–33), збірки й локалізація (34), мережа й розгортання (35). А «Аналіз алгоритмів» (складність, О-нотація) у програмі не фігурує взагалі.
- **Розділ «Практична частина» теж не про цей курс:** «Робота з базовими структурами даних: **списки, стеки, черги, дерева**», «Методи оптимізації коду». Дерева й оптимізація в 35 темах не зустрічаються; натомість немає ані слова про створення застосунків з графічним інтерфейсом і роботу з БД, які й становлять весь 2 семестр.

### Варто виправити

- «У 1 семестрі вивчаємо лише консольні застосунки та базові основи програмування» — «базові основи» тавтологія; і варто уточнити, що йдеться про C#, ООП і роботу з файлами.
- «які поступово приведуть вас до створення фінального невеликого проєкту» — за новою програмою структура підсумкової роботи змінилась; треба звірити.
- Немає жодної згадки про **екзамен/залік**, критерії оцінювання, склад підсумкового контролю — для сторінки «Загальна інформація про курс» це очікувана інформація.
- Немає посилання на `docs/c-sharp.md` — хоча це логічно наступна сторінка.
- Файл не містить **жодного** admonition, таблиці чи блоку коду (84 рядки чистого тексту).

### Карта курсу — так, треба додати

Зараз студент, який відкрив сайт, не має жодного уявлення про його структуру: у сайдбарі 35+ пунктів без групування за семестрами. Рекомендую додати у `docs/intro.md` таблицю-карту:

```
## Карта курсу

### Семестр 1 — основи мови (консоль)
| Теми | Блок | Лаб. | Практ. |
|---|---|---|---|
| 1–5   | Вступ, змінні, типи, галуження, цикли | … | … |
| 6–10  | Масиви, методи, рядки, файли | … | … |
| 11–15 | ООП: класи, наслідування, поліморфізм | … | … |
| 16–20 | Колекції, винятки, узагальнення, делегати | … | … |

### Семестр 2 — застосунки (GUI, дані, багатопотоковість)
| Теми | Блок | Лаб. | Практ. |
|---|---|---|---|
| 21–26 | Графічний інтерфейс на Windows Forms | … | … |
| 27–28 | Рядки, регулярні вирази, LINQ | … | … |
| 29–31 | Дані: XML/JSON, ADO.NET, Entity Framework Core | … | … |
| 32–33 | Багатопотоковість, паралельність, асинхронність | … | … |
| 34–35 | Збірки, локалізація, мережа, розгортання | … | … |

### Додатково (поза програмою)
Анімації та математична графіка у WPF; спрайтова анімація.
```

Точні назви блоків треба звірити з темами 1–20 (у цьому бандлі їх немає). Така таблиця також дасть змогу проставити реальні числа лабораторних і практичних по блоках.

---

## `docs/c-sharp.md`

### Критично

- **Застаріле й неправильне твердження про платформу.** Розділ «Недоліки»:
  > «**Залежність від Windows** — сильний зв'язок з екосистемою Microsoft»

  З .NET Core 1.0 (2016) і особливо .NET 5+ (2020) C#/.NET — **повністю кросплатформенні** (Linux, macOS, Android, iOS, WebAssembly). Це найгрубіша фактична помилка сторінки, і вона суперечить самому ж тексту вище: «C# тісно пов'язаний з .NET Framework і .NET Core (нині .NET)».
- **Xamarin — мертва технологія.** «Мобільна розробка: **Xamarin** дає можливість розробляти додатки для Android та iOS». Підтримка Xamarin **завершилась 1 травня 2024 року**; наступник — **.NET MAUI**. Станом на 2026 рік це дезінформація.
- **Сторінка про мову програмування без жодного рядка коду.** 79 рядків суцільного тексту: 0 блоків ```` ```csharp ````, 0 таблиць, 0 admonitions, 0 схем. STYLE.md вимагає код, таблиці, admonitions у кожному підрозділі. Для сторінки «Що таке C#?» відсутність хоча б `Console.WriteLine("Привіт!")` виглядає дивно.

### Варто виправити

- «створена компанією Microsoft **у 2000 році**» — анонс справді 2000 (разом із .NET), але **перший реліз C# 1.0 — лютий 2002** (з Visual Studio .NET). Варто написати обидві дати.
- **Немає жодної згадки про версію мови.** Курс іде на **C# 12 / .NET 8** (STYLE.md), а стаття про мову не називає ані поточної версії, ані того, що мова розвивається щорічно. Мінімум: абзац «Мова оновлюється щороку разом із .NET; у цьому курсі — C# 12 та .NET 8 (LTS)», плюс коротка таблиця ключових віх (C# 6 — інтерполяція рядків, C# 8 — nullable reference types, C# 9 — records і top-level statements, C# 12 — collection expressions).
- Розділ «Переваги та недоліки» — беззмістовний. «Недоліки: Відносна складність для новачків — потребує часу на вивчення» стосується будь-якої мови. Реальні компроміси C# (GC-паузи, розмір рантайму, історична прив'язка десктопного UI до Windows) не названі.
- **Порушення структури заголовків.** Після `# Що таке C#?` одразу йде `### Огляд мови програмування C#`, далі `### 1. Що таке C#?`, `### 2. …`. Рівень `##` пропущено повністю — це ламає зміст сторінки (table of contents) у Docusaurus. STYLE.md: «Далі структура `##` / `###`». Плюс `### 1. Що таке C#?` дублює заголовок сторінки `# Що таке C#?`.
- Нумерація «1. … 2. …» у заголовках — зайва, Docusaurus і так будує зміст.

### Дрібниці

- «Синтаксис C# зрозумілий і **запозичує найкращі риси C++ і Java**» — усталений штамп; варто додати, що останні 10 років вплив ішов і у зворотний бік (Java запозичила records, pattern matching).
- «Unity використовує C# як основну мову» — правильно, але варто додати Godot (C# підтримується офіційно) і згадати, що це найпопулярніший вхід у C# для школярів.
- `sidebar_position: 1` у `docs/c-sharp.md` — потенційний конфлікт із категорією `topic_1` (якщо її `position` теж 1). Варто дати цій сторінці `sidebar_position: 0.5` або перенести в окрему категорію «Про курс» разом із `intro.md`.

---

## Розділ «Додатково»

Рішення винести WPF-анімації та спрайти у факультатив — **правильне**: це найцікавіший для студентів матеріал, він добре мотивує, і його явно позначено «поза програмою» (`_category_.json`: «Додатково (поза програмою)», `position: 100`). Якість помітно вища за теми 21–23: є admonitions, таблиці, посилання на джерела формул, повні робочі проєкти.

Але є проблеми.

### Критично

- **Конфлікт нумерації в назвах категорій.** `docs/extra/wpf_animations/_category_.json`: `"label": "Тема 20. Анімації та математична графіка у WPF"`; `docs/extra/wpf_sprites/_category_.json`: `"label": "Тема 21. Спрайтова анімація та рух персонажа у WPF"`. У курсі вже є **Тема 20** (1 семестр) і **Тема 21** (Windows Forms). У сайдбарі студент побачить дві «Теми 21» поспіль. Треба прибрати нумерацію з факультативу («Анімації та математична графіка у WPF» без «Тема 20.»).
- **Помилка компіляції C#**, `wpf_animations/intro.md`:
  ```csharp
  EasingFunction = new BounceEase { Bounces = 3, EasinMode = EasingMode.EaseOut }
  ```
  `EasinMode` → `EasingMode`. Пропущена літера.
- **Неіснуючий клас у таблиці**, `wpf_animations/intro.md`: рядок «`LinearEase` | Рівномірно (за замовчуванням)». У WPF **немає класу `LinearEase`** — лінійна інтерполяція це просто відсутність `EasingFunction`. STYLE.md прямо забороняє «вигадувати API, якого немає в .NET». (`SineEase`, `BounceEase`, `ElasticEase`, `QuadraticEase` існують.)
- **Помилка компіляції XAML/C#**, тричі: `wpf_sprites/subtopic2.md` (`Tilemap.Render`), `wpf_sprites/subtopic3.md` (`BuildMap`, `BuildHero`):
  ```csharp
  var img = new Image
  {
      Width = TileWidth,
      RenderOptions = { BitmapScalingMode = BitmapScalingMode.NearestNeighbor }
  };
  ```
  `Image.RenderOptions` **не є властивістю** — `RenderOptions` це статичний клас із прикріпленими властивостями. Правильно:
  ```csharp
  RenderOptions.SetBitmapScalingMode(img, BitmapScalingMode.NearestNeighbor);
  ```
  Три однакові помилки, які роблять фінальний ігровий приклад некомпільованим.
- **Приклад, що ламає власний застосунок**, `wpf_animations/subtopic3.md`, «Покрокове малювання прямої лінії»:
  ```csharp
  private void OnDrawLine_Click(object sender, RoutedEventArgs e)
  {
      _timer?.Stop();
      MainCanvas.Children.Clear();
      // Повторно додаємо кнопки (вони були на Canvas і очистились)
      // Краща практика — розмістити кнопки поза Canvas або зберегти посилання
      // Тут для простоти — перезапуск через програмне керування
  ```
  Кнопки — діти того самого `Canvas`, тому `Children.Clear()` їх знищує: після **першого ж кліку** застосунок стає непридатним, кнопок на екрані більше немає. Коментар проблему визнає і **не вирішує**. Треба просто винести кнопки в `DockPanel`/`StackPanel` поза `Canvas` (як зроблено у фінальному прикладі того ж файлу).

### Варто виправити

- **Суперечливі легенди тайлів** — три різні версії в межах двох файлів:
  - `wpf_sprites/subtopic2.md`, ASCII-схема угорі: «0 = вода, 1 = трава, 2 = дерево»;
  - `wpf_sprites/subtopic2.md`, схема тайлсету і `TileProperties`: «0 трава, 1 вода, 2 пісок, 3 камінь, 4 дерево, 5 стіна»;
  - `wpf_sprites/subtopic2.md`, коментар до `DemoMap`: «0=трава, 1=вода, **3=стіна**, 4=дерево»;
  - `wpf_sprites/subtopic3.md`, `TileProperties`: «`{3, false} // стіна`» (у subtopic2 той самий id — «камінь»).

  Студент не зможе зрозуміти, що означає `3` у карті. Треба одну легенду на весь розділ.
- **Суперечливі розміри спрайт-аркуша.** `wpf_sprites/intro.md`: «hero_spritesheet.png (256×64 px)», «4 кадри 64×64». `wpf_sprites/subtopic1.md`: «hero_spritesheet.png (192×256 px, кадри 48×64)», але показано лише **3** кадри в ряду (3 × 48 = 144, не 192), і в коді всюди `frameCount: 3`. Треба звірити: або 192 px = 4 кадри (тоді `frameCount: 4`), або 144 px.
- **Текст суперечить коду щодо діагонального руху.** `wpf_sprites/subtopic1.md` після `OnGameTick` пише: «`HashSet<Key>` дозволяє: 1. Тримати кілька кнопок одночасно (**діагональний рух**)» — але сам `OnGameTick` вище побудований на `if / else if / else if / else if`, тому діагональ **неможлива**. Далі наводиться «правильний» фрагмент з чотирма незалежними `if`, але він не інтегрований у приклад. У `subtopic3.md` це вже зроблено правильно (`dx`/`dy` окремо). Треба привести `subtopic1.md` у відповідність.
- **Ризик продуктивності.** `wpf_animations/subtopic2.md`, пресет «Складна зірка» R=100, r=37: `gcd(100,37)=1` → `tMax = 2π·37 ≈ 232`, `steps = 232/0.002 ≈ 116 000` точок в одному `Polyline`. У фінальному прикладі `subtopic3.md` крок ще дрібніший (`0.001`) → **232 000 точок**. WPF `Polyline` на такій кількості точок відчутно підвисне. Потрібен адаптивний крок або `StreamGeometry`.
- **Неточності в таблиці спірографа** (`wpf_animations/subtopic2.md`): «150 | 50 | 120 | Трикутна спіраль» — при R/r = 3 це класичний **дельтоїд** (3 вістря); «120 | 45 | 120 | Дельтоїд» — при R/r ≈ 2.67 це **не** дельтоїд. Схоже, підписи двох рядків переплутані.
- **Самосуперечливий admonition про вісь Y** (`wpf_animations/subtopic2.md`):
  > «потрібно змінювати знак `y`: `cy + y * scale` замість `cy - y * scale`»

  При тому що в коді вже стоїть `y = -(13*cos t - …)`, тобто знак змінено **двічі**. Формулювання плутає замість того, щоб пояснити. Треба одне чітке правило: «формулу рахуємо в математичних координатах, а при переносі на Canvas робимо `cy - y * scale`».
- `wpf_animations/subtopic2.md`, `DrawHeart()` створює змінну `polyline`, яка **ніде не використовується**, з коментарем усередині ініціалізатора об'єкта, а потім створюється `polygon`. Мертвий код у навчальному прикладі.
- `wpf_animations/subtopic1.md`, «анімований світлофор»: дві анімації (`AddLight("YellowBrush", …, beginAt: 3)` і `beginAt: 7.5`) націлені на **одну й ту саму властивість одного об'єкта** в межах одного `Storyboard`. WPF у такому разі застосовує останню (конфлікт анімацій), тож жовтий, найімовірніше, спрацює не так, як заявлено. Потрібно перевірити на реальному запуску або переписати через `ColorAnimationUsingKeyFrames`.
- Усі файли `docs/extra/` оголошують поля на кшталт `private DispatcherTimer _timer;` без ініціалізації — у шаблоні .NET 8 із увімкненими nullable reference types це десятки попереджень **CS8618**. Або `?`, або `= null!`.

### Що вже добре

- Таблиця «Windows Forms vs WPF» у `wpf_animations/intro.md` — саме те пояснення, якого бракує в темах 29–33, де WPF з'являється без попередження. **Варто перенести її (або посилання на неї) у місце першої появи WPF в основному курсі.**
- Пояснення `NameScope` і `Storyboard.SetTargetName`/`SetTargetProperty` — тонке місце WPF, подане коротко і правильно.
- Таблиця ресурсів із формулами кривих (MathWorld, Desmos, 2dcurves) і таблиця ресурсів зі спрайтами (Kenney, OpenGameArt, itch.io) із зазначенням ліцензій — практично корисно.
- KaTeX-формули кривих (`$$x(t) = 16\sin^3(t)$$`) із посиланням на першоджерело — акуратно.
- `RenderToImage()` через `DrawingVisual` + `RenderTargetBitmap` замість тисяч `Image`-елементів — правильна і добре пояснена оптимізація.
- Розділ «Покроковий план реалізації свого проекту» (9 кроків) — ідеальний формат для факультативу.
- Admonition про `NearestNeighbor` для pixel art — саме та деталь, без якої студентські спрайти виглядають розмито.

---

## Конфігурація сайту

### `docusaurus.config.ts`

| # | Проблема | Зараз | Має бути |
|---|---|---|---|
| 1 | **`i18n` — англійська локаль при українському контенті** | `defaultLocale: 'en', locales: ['en']` | `defaultLocale: 'uk', locales: ['uk']`. Зараз сторінки видаються з `<html lang="en">`: неправильні переноси, скрінрідери читають українську англійською фонетикою, у пошуку сайт індексується як англомовний, а вбудований UI Docusaurus («Next», «Previous», «On this page») залишається англійським. Це найпомітніший дефект конфігурації. |
| 2 | **`editUrl` веде в чужий репозиторій** | `'https://github.com/facebook/docusaurus/tree/main/packages/create-docusaurus/templates/shared/'` (двічі: `docs` і `blog`) | `'https://github.com/sebastian-uzhnu/opam-lectures/tree/main/'` — або прибрати обидва поля, щоб зникло посилання «Edit this page». Зараз кожна сторінка лекції пропонує студенту редагувати шаблон Docusaurus на GitHub Facebook. |
| 3 | **Назва сайту англійською** | `title: 'OPAM Lectures'` і `navbar.title: 'OPAM Lectures'` | «Основи програмування та алгоритмічні мови» (або «ОПАМ — лекції»). Курс україномовний; англійська абревіатура в заголовку вкладки браузера не допомагає студентові знайти сайт. |
| 4 | **Блог увімкнено, але не використовується** | секція `blog: { … }` у пресеті | Блогу немає в навбарі й немає постів; при цьому конфіг містить `feedOptions`, `onInlineTags`, `onUntruncatedBlogPosts`. Якщо блог не планується — `blog: false`. Інакше Docusaurus генерує порожні RSS/Atom-стрічки. |
| 5 | **Залишки шаблону** | `logo.alt: 'My Site Logo'`, `image: 'img/docusaurus-social-card.jpg'`, `src: 'img/logo.svg'` | `alt` — українською («Логотип курсу ОПАМ»); соціальна картка — своя, інакше в кожному посиланні на курс у месенджерах показуватиметься логотип Docusaurus. |
| 6 | **Можливий конфлікт `baseUrl` із GitHub Pages** | `url: 'https://sebastian-uzhnu.github.io'`, `baseUrl: '/'`, `projectName: 'opam-lectures'` | Для *project site* (репозиторій `opam-lectures`) `baseUrl` має бути `'/opam-lectures/'`; `'/'` коректний лише для *user site* (репозиторій, названий `sebastian-uzhnu.github.io`). Треба перевірити, куди реально деплоїться, — інакше всі CSS/JS-ресурси віддаватимуть 404. |
| 7 | **Застаріла версія KaTeX** | `katex@0.13.24` (2021) | Актуальна гілка — `0.16.x`. Разом із `remark-math`/`rehype-katex` варто оновити, зокрема через виправлення рендерингу. |
| 8 | `remarkMath`/`rehypeKatex` підключені лише до `docs` | — | Якщо блог залишається — формули в ньому не рендеритимуться. |
| 9 | Немає посилання на репозиторій курсу | `navbar` і `footer` ведуть на `https://github.com/sebastian-uzhnu` (профіль) | Має вести на репозиторій `…/opam-lectures`, щоб студент міг знайти вихідники й завести issue. |
| 10 | Немає `tagline` і `metadata` | — | Для SEO і для сторінки-шапки варто додати `tagline` українською та `themeConfig.metadata` з `description`. |

Позитивне: `onBrokenLinks: 'throw'` увімкнено (збірка впаде на битому посиланні) — правильне налаштування; `future.v4: true` — теж, готує до Docusaurus v4.

### `sidebars.ts`

- Конфігурація мінімальна й робоча: `tutorialSidebar: [{type: 'autogenerated', dirName: '.'}]`. Мертвих посилань немає — порядок повністю визначається `sidebar_position` у frontmatter і `position` у `_category_.json`.
- У файлі залишився **закоментований шаблонний блок** (`'intro', 'hello', 'tutorial-basics/create-a-document'`) — прибрати.
- **Ризик колізії позицій у корені `docs/`:** `docs/intro.md` має `sidebar_position: 0`, `docs/c-sharp.md` — `sidebar_position: 1`, а категорія `topic_1`, найімовірніше, має `"position": 1`. При однаковій позиції Docusaurus сортує за алфавітом, і `c-sharp.md` може опинитися після теми 1. Рекомендую винести обидві сторінки у власну категорію «Про курс» (`position: 0`) або дати `c-sharp.md` позицію `0.5`.
- **Порожні категорії тем 24–28, 34, 35** із `link.type: "generated-index"` рендеряться як сторінки з описом і **порожнім** списком підрозділів. Поки теми не написані, варто або тимчасово прибрати ці папки, або додати в кожну заглушку `intro.md` з рядком «Матеріал у підготовці».
- Порушення угоди про імена файлів: у `topic_32` файли `sync_intro.md`, `sync_subtopic1..3.md` замість `subtopic4..7.md`. Автогенерований сайдбар це переживе (сортування за `sidebar_position`), але STYLE.md задає інші імена, і при перенумерації це джерело помилок.

---

## Рекомендований план дій

Порядок — за співвідношенням «шкода / вартість виправлення».

1. **Виправити `docs/intro.md`** *(~1 година)*. Числа лабораторних і практичних (17+11 / 11+6 / 28+17), замінити «Python, C++, Java» на C#, полагодити розрив `**` у рядках 16–17, переписати розділи «Основні теми» і «Практична частина» під реальні 35 тем, додати карту курсу за блоками. Це головна сторінка — зараз вона дезінформує з першого екрана.

2. **Ухвалити рішення WinForms vs WPF і зафіксувати його письмово** *(рішення — 1 день; виконання — див. п. 8)*. Поки рішення немає, писати теми 24–26 не можна: вони прямо залежать від технології. Рекомендація — Варіант А (WinForms), бо теми 24–26 у програмі прив'язані до `DataGridView`/`Chart`/Designer.

3. **Перекроїти теми 32 і 33 за планом вище** *(~3–4 години, переважно переміщення файлів)*. Перенести `ThreadPool/Task` і `async/await` із 32 у 33; залишити в 32 тільки потоки й синхронізацію; винести TPL Dataflow у `docs/extra/`; перенести WPF-завантажувач файлів у тему 35. Вийде 4+5 файлів замість 8+4, і обидві теми почнуть відповідати програмі.

4. **Полагодити 12 помилок у коді, які не компілюються або дають неправильний результат** *(~2 години)*, у порядку критичності:
   - `topic_29/intro.md` — подвійне оголошення `XDocument doc` (CS0128);
   - `topic_29/subtopic1.md` — `active="True"` замість `"true"` і як наслідок непрацюючий фільтр `== "False"`;
   - `topic_29/subtopic2.md` — «.NET 3.0» → «.NET Core 3.0 / .NET 5+»;
   - `topic_29/subtopic3.md` — `OnEditorChanged` завжди вмикає `_dirty`;
   - `topic_30/subtopic3.md` — `INSERT INTO grades` у неіснуючу таблицю;
   - `topic_32/sync_subtopic3.md` — `StackPanel Spacing="24"` (немає у WPF);
   - `topic_32/sync_subtopic3.md` — бракує `using System.Windows.Threading;` для `Dispatcher.BeginInvoke(Action)`;
   - `topic_32/sync_subtopic1.md` — бракує `using System.Threading.Tasks;` для `Parallel.For`;
   - `topic_32/sync_subtopic2.md` — `Interlocked.CompareExchange(ref _config)` по `volatile`-полю (CS0420);
   - `extra/wpf_animations/intro.md` — `EasinMode` → `EasingMode`, прибрати неіснуючий `LinearEase`;
   - `extra/wpf_sprites/subtopic2.md` + `subtopic3.md` (×3) — `RenderOptions = { … }` → `RenderOptions.SetBitmapScalingMode(…)`;
   - `extra/wpf_animations/subtopic3.md` — `Children.Clear()` знищує кнопки.

5. **Виправити наскрізні суперечності** *(~1 година)*:
   - три посилання на «Тему 23/24» замість 30/31 (`topic_30/intro.md` ×2, `topic_31/subtopic3.md` ×1);
   - три випадки `using var client = new HttpClient()` всередині методу, які суперечать власному `:::warning` (`topic_32/sync_subtopic1.md`, `topic_33/subtopic2.md`);
   - неволатильні `bool`-прапорці в `topic_32/intro.md`, що суперечать розділу про `volatile`;
   - суперечливі числа продуктивності SQLite (`topic_30/subtopic1.md` vs `subtopic3.md`);
   - вигадані замiри `Fib` у `topic_33/intro.md`;
   - три різні легенди тайлів і два різні розміри спрайт-аркуша в `docs/extra/wpf_sprites/`;
   - нумерація «Тема 20/21» у назвах категорій `docs/extra/`.

6. **Прибрати дублювання в темі 30** *(~1 година)*. Видалити з `subtopic1.md` розділи «Транзакції», «Зв'язки між таблицями (JOIN)» і «Масова вставка» (вони повністю повторені в `subtopic3.md`), залишивши там чистий CRUD-репозиторій. Це скоротить тему на ~120 рядків без втрати змісту.

7. **Полагодити конфігурацію сайту** *(~30 хвилин)*. `i18n` → `uk`; `editUrl` → репозиторій курсу (або прибрати); `title` українською; `blog: false`; `logo.alt` і соціальна картка; перевірити `baseUrl` під реальний тип GitHub Pages; оновити KaTeX до 0.16.x; посилання в навбарі — на репозиторій, а не на профіль.

8. **Довести теми 21–23 до стандарту STYLE.md** *(~3–4 дні)*. Це найдорожчий пункт, але без нього перші три теми семестру не витримують порівняння навіть із факультативом:
   - дописати код у `topic_21/intro.md`, `subtopic1.md`, `subtopic2.md` (зараз 0 блоків коду на три файли);
   - додати по 2–4 admonition і хоча б одну таблицю-порівняння та ASCII-схему в кожен підрозділ;
   - **дописати меню, контекстні меню, `ToolStrip`, `StatusStrip` у тему 23** (зараз їх немає взагалі, це ~40% опису теми);
   - **дописати `TabControl` і `Anchor`/`Dock` у тему 22**;
   - довести обсяг підрозділів до 250–500 рядків;
   - виправити `LayoutMdi` («статичний метод» → екземплярний), `CreateGraphics()` без застереження, конкатенацію замість інтерполяції, з'їдені зірочки у `Filter`.

9. **Написати 15 файлів `practice.md`** *(~2 дні)*. По одному на кожну тему 21–35 за шаблоном STYLE.md: 12–18 питань за підрозділами, 3–5 міні-задач, одне ДЗ на 30–45 хвилин. Для тем із наявним контентом (21–23, 29–33) це робиться швидко — матеріал уже містить готові кандидати в задачі (наприклад, `TextChanged` → `Enabled` у темі 21, «підказка» про debounce у темі 30).

10. **Закрити прогалини проти програми в наявних темах** *(~1 день)*:
    - тема 29 — XSD-валідація (`XDocument.Validate`) і хоча б один REST-приклад;
    - тема 30 — абзац про `SqlConnection`/`SqlCommand`/`SqlDataReader` для SQL Server із таблицею відповідності класам SQLite;
    - тема 31 — розділ про Database First зі `scaffold`-командою;
    - тема 33 — короткий розділ про `Channel<T>` (уже згаданий у підсумковій таблиці, але ніде не викладений) або прибрати його з таблиці.

11. **Написати 7 порожніх тем** *(основний обсяг роботи, ~3–4 тижні)*. Пріоритет за залежностями: спочатку **27 (рядки/regex)** і **28 (LINQ)** — вони потрібні як фундамент для 29–31, які вже написані і мовчазно припускають знання LINQ; потім **24–26** (залежать від рішення п. 2); потім **34–35** (у тему 35 уже є готовий практикум-донор — WPF-завантажувач із `topic_32/subtopic3.md`). До написання теми 26 окремо перевірити, чим замінити недоступний у .NET 8 `System.Windows.Forms.DataVisualization.Charting.Chart`.

12. **Оновити `docs/c-sharp.md`** *(~1 година)*. Прибрати «Залежність від Windows» із недоліків, замінити Xamarin на .NET MAUI, додати абзац про версії мови (C# 12 / .NET 8) з короткою таблицею віх, вставити хоча б один приклад коду, полагодити ієрархію заголовків (`###` без `##`), прибрати нумерацію із заголовків.

13. **Косметика факультативу** *(~1 година)*. Виправити таблицю пресетів спірографа (переплутані «дельтоїд» і «трикутна спіраль»), адаптивний крок для кривих зі 100k+ точок, узгодити текст про діагональний рух із кодом, `= null!` для полів, що дають CS8618.
