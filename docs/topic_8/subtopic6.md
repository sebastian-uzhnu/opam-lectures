# Методи сортування

### Сортування бульбашкою (Bubble Sort)

Цей алгоритм проходить по масиву, порівнює сусідні елементи і обмінює їх місцями, якщо вони знаходяться в неправильному порядку. Процес повторюється до тих пір, поки масив не буде відсортований.

```csharp
void BubbleSort(int[] arr)
{
    int n = arr.Length;
    for (int i = 0; i < n - 1; i++)
    {
        for (int j = 0; j < n - i - 1; j++)
        {
            if (arr[j] > arr[j + 1])
            {
                // Обмін значеннями
                int temp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = temp;
            }
        }
    }
}

```

### Сортування вибором (Selection Sort)

Алгоритм знаходить найменший (або найбільший) елемент у масиві та переміщує його на початок. Процес повторюється для решти масиву.

```csharp
void SelectionSort(int[] arr)
{
    int n = arr.Length;
    for (int i = 0; i < n - 1; i++)
    {
        int minIndex = i;
        for (int j = i + 1; j < n; j++)
        {
            if (arr[j] < arr[minIndex])
            {
                minIndex = j; // Знайдено новий мінімум
            }
        }
        // Обмін значеннями
        int temp = arr[minIndex];
        arr[minIndex] = arr[i];
        arr[i] = temp;
    }
}

```

### Сортування вставками (Insertion Sort)

Алгоритм працює шляхом розділення масиву на відсортовану та не відсортовану частини. Він перебирає елементи з не відсортованої частини і вставляє їх у правильне місце у відсортованій частині.

```csharp
void InsertionSort(int[] arr)
{
    int n = arr.Length;
    for (int i = 1; i < n; i++)
    {
        int key = arr[i];
        int j = i - 1;

        // Переміщення елементів, що більші за ключ
        while (j >= 0 && arr[j] > key)
        {
            arr[j + 1] = arr[j];
            j--;
        }
        arr[j + 1] = key;
    }
}

```

### Швидке сортування (Quick Sort)

Цей алгоритм обирає "опорний" елемент і розділяє масив на дві частини: менші за опорний елемент і більші. Потім рекурсивно сортує ці частини.

```csharp
void QuickSort(int[] arr, int low, int high)
{
    if (low < high)
    {
        int pi = Partition(arr, low, high);
        QuickSort(arr, low, pi - 1);  // Сортуємо елементи до опорного
        QuickSort(arr, pi + 1, high); // Сортуємо елементи після опорного
    }
}

int Partition(int[] arr, int low, int high)
{
    int pivot = arr[high]; // Останній елемент як опорний
    int i = (low - 1); // Індекс меншого елемента

    for (int j = low; j < high; j++)
    {
        if (arr[j] < pivot)
        {
            i++;
            // Обмін
            int temp = arr[i];
            arr[i] = arr[j];
            arr[j] = temp;
        }
    }
    // Обмін опорного елемента з елементом, що знаходиться після менших
    int temp1 = arr[i + 1];
    arr[i + 1] = arr[high];
    arr[high] = temp1;

    return i + 1;
}

```

### Сортування злиттям (Merge Sort)

Цей алгоритм ділить масив на дві половини, рекурсивно сортує кожну з них, а потім зливає їх назад в один відсортований масив.

```csharp
void MergeSort(int[] arr)
{
    if (arr.Length < 2)
        return;

    int mid = arr.Length / 2;
    int[] left = new int[mid];
    int[] right = new int[arr.Length - mid];

    Array.Copy(arr, 0, left, 0, mid);
    Array.Copy(arr, mid, right, 0, arr.Length - mid);

    MergeSort(left);
    MergeSort(right);

    Merge(arr, left, right);
}

void Merge(int[] arr, int[] left, int[] right)
{
    int i = 0, j = 0, k = 0;

    while (i < left.Length && j < right.Length)
    {
        if (left[i] <= right[j])
            arr[k++] = left[i++];
        else
            arr[k++] = right[j++];
    }

    while (i < left.Length)
        arr[k++] = left[i++];
    while (j < right.Length)
        arr[k++] = right[j++];
}

```
