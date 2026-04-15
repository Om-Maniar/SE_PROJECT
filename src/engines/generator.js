/**
 * CodeLens — Algorithm-to-Code Generator
 * Template-based code generation for common algorithms in multiple languages.
 */
const ALGORITHMS = {
  'bubble-sort': {
    name: 'Bubble Sort',
    category: 'Sorting',
    description: 'Simple comparison-based sorting algorithm. O(n²) time.',
    templates: {
      python: `def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        swapped = False
        for j in range(0, n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
                swapped = True
        if not swapped:
            break
    return arr

# Example usage
data = [64, 34, 25, 12, 22, 11, 90]
print("Sorted:", bubble_sort(data))`,
      javascript: `function bubbleSort(arr) {
  const n = arr.length;
  for (let i = 0; i < n; i++) {
    let swapped = false;
    for (let j = 0; j < n - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
        swapped = true;
      }
    }
    if (!swapped) break;
  }
  return arr;
}

// Example usage
console.log("Sorted:", bubbleSort([64, 34, 25, 12, 22, 11, 90]));`,
      java: `public class BubbleSort {
    public static void bubbleSort(int[] arr) {
        int n = arr.length;
        for (int i = 0; i < n; i++) {
            boolean swapped = false;
            for (int j = 0; j < n - i - 1; j++) {
                if (arr[j] > arr[j + 1]) {
                    int temp = arr[j];
                    arr[j] = arr[j + 1];
                    arr[j + 1] = temp;
                    swapped = true;
                }
            }
            if (!swapped) break;
        }
    }

    public static void main(String[] args) {
        int[] data = {64, 34, 25, 12, 22, 11, 90};
        bubbleSort(data);
        System.out.println("Sorted: " + java.util.Arrays.toString(data));
    }
}`,
      'c++': `#include <iostream>
#include <vector>
using namespace std;

void bubbleSort(vector<int>& arr) {
    int n = arr.size();
    for (int i = 0; i < n; i++) {
        bool swapped = false;
        for (int j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                swap(arr[j], arr[j + 1]);
                swapped = true;
            }
        }
        if (!swapped) break;
    }
}

int main() {
    vector<int> data = {64, 34, 25, 12, 22, 11, 90};
    bubbleSort(data);
    for (int x : data) cout << x << " ";
    return 0;
}`,
      c: `#include <stdio.h>

void bubbleSort(int arr[], int n) {
    for (int i = 0; i < n; i++) {
        int swapped = 0;
        for (int j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                int temp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = temp;
                swapped = 1;
            }
        }
        if (!swapped) break;
    }
}

int main() {
    int data[] = {64, 34, 25, 12, 22, 11, 90};
    int n = sizeof(data) / sizeof(data[0]);
    bubbleSort(data, n);
    for (int i = 0; i < n; i++) printf("%d ", data[i]);
    return 0;
}`
    }
  },
  'merge-sort': {
    name: 'Merge Sort', category: 'Sorting',
    description: 'Divide and conquer sorting. O(n log n) time, O(n) space.',
    templates: {
      python: `def merge_sort(arr):
    if len(arr) <= 1:
        return arr
    mid = len(arr) // 2
    left = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])
    return merge(left, right)

def merge(left, right):
    result = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            result.append(left[i]); i += 1
        else:
            result.append(right[j]); j += 1
    result.extend(left[i:])
    result.extend(right[j:])
    return result

print("Sorted:", merge_sort([38, 27, 43, 3, 9, 82, 10]))`,
      javascript: `function mergeSort(arr) {
  if (arr.length <= 1) return arr;
  const mid = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid));
  const right = mergeSort(arr.slice(mid));
  return merge(left, right);
}

function merge(left, right) {
  const result = [];
  let i = 0, j = 0;
  while (i < left.length && j < right.length) {
    if (left[i] <= right[j]) result.push(left[i++]);
    else result.push(right[j++]);
  }
  return result.concat(left.slice(i), right.slice(j));
}

console.log("Sorted:", mergeSort([38, 27, 43, 3, 9, 82, 10]));`,
      java: `import java.util.Arrays;

public class MergeSort {
    public static void mergeSort(int[] arr, int l, int r) {
        if (l < r) {
            int m = (l + r) / 2;
            mergeSort(arr, l, m);
            mergeSort(arr, m + 1, r);
            merge(arr, l, m, r);
        }
    }

    static void merge(int[] arr, int l, int m, int r) {
        int[] left = Arrays.copyOfRange(arr, l, m + 1);
        int[] right = Arrays.copyOfRange(arr, m + 1, r + 1);
        int i = 0, j = 0, k = l;
        while (i < left.length && j < right.length)
            arr[k++] = left[i] <= right[j] ? left[i++] : right[j++];
        while (i < left.length) arr[k++] = left[i++];
        while (j < right.length) arr[k++] = right[j++];
    }

    public static void main(String[] args) {
        int[] data = {38, 27, 43, 3, 9, 82, 10};
        mergeSort(data, 0, data.length - 1);
        System.out.println(Arrays.toString(data));
    }
}`,
      'c++': `#include <iostream>
#include <vector>
using namespace std;

void merge(vector<int>& arr, int l, int m, int r) {
    vector<int> left(arr.begin()+l, arr.begin()+m+1);
    vector<int> right(arr.begin()+m+1, arr.begin()+r+1);
    int i=0, j=0, k=l;
    while(i<left.size() && j<right.size())
        arr[k++] = left[i]<=right[j] ? left[i++] : right[j++];
    while(i<left.size()) arr[k++]=left[i++];
    while(j<right.size()) arr[k++]=right[j++];
}

void mergeSort(vector<int>& arr, int l, int r) {
    if(l<r) { int m=(l+r)/2; mergeSort(arr,l,m); mergeSort(arr,m+1,r); merge(arr,l,m,r); }
}

int main() {
    vector<int> data={38,27,43,3,9,82,10};
    mergeSort(data,0,data.size()-1);
    for(int x:data) cout<<x<<" ";
}`,
      c: `#include <stdio.h>
#include <stdlib.h>

void merge(int arr[], int l, int m, int r) {
    int n1=m-l+1, n2=r-m;
    int *L=malloc(n1*sizeof(int)), *R=malloc(n2*sizeof(int));
    for(int i=0;i<n1;i++) L[i]=arr[l+i];
    for(int j=0;j<n2;j++) R[j]=arr[m+1+j];
    int i=0,j=0,k=l;
    while(i<n1&&j<n2) arr[k++]=L[i]<=R[j]?L[i++]:R[j++];
    while(i<n1) arr[k++]=L[i++];
    while(j<n2) arr[k++]=R[j++];
    free(L); free(R);
}

void mergeSort(int arr[], int l, int r) {
    if(l<r) { int m=(l+r)/2; mergeSort(arr,l,m); mergeSort(arr,m+1,r); merge(arr,l,m,r); }
}

int main() {
    int data[]={38,27,43,3,9,82,10}; int n=7;
    mergeSort(data,0,n-1);
    for(int i=0;i<n;i++) printf("%d ",data[i]);
}`
    }
  },
  'quick-sort': {
    name: 'Quick Sort', category: 'Sorting',
    description: 'Efficient divide-and-conquer sort. O(n log n) average.',
    templates: {
      python: `def quick_sort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quick_sort(left) + middle + quick_sort(right)

print("Sorted:", quick_sort([3, 6, 8, 10, 1, 2, 1]))`,
      javascript: `function quickSort(arr) {
  if (arr.length <= 1) return arr;
  const pivot = arr[Math.floor(arr.length / 2)];
  const left = arr.filter(x => x < pivot);
  const middle = arr.filter(x => x === pivot);
  const right = arr.filter(x => x > pivot);
  return [...quickSort(left), ...middle, ...quickSort(right)];
}
console.log("Sorted:", quickSort([3, 6, 8, 10, 1, 2, 1]));`,
      java: `import java.util.Arrays;
public class QuickSort {
    public static void quickSort(int[] arr, int low, int high) {
        if (low < high) {
            int pi = partition(arr, low, high);
            quickSort(arr, low, pi - 1);
            quickSort(arr, pi + 1, high);
        }
    }
    static int partition(int[] arr, int low, int high) {
        int pivot = arr[high], i = low - 1;
        for (int j = low; j < high; j++) {
            if (arr[j] < pivot) { i++; int t=arr[i]; arr[i]=arr[j]; arr[j]=t; }
        }
        int t=arr[i+1]; arr[i+1]=arr[high]; arr[high]=t;
        return i + 1;
    }
    public static void main(String[] args) {
        int[] data = {3,6,8,10,1,2,1};
        quickSort(data, 0, data.length-1);
        System.out.println(Arrays.toString(data));
    }
}`,
      'c++': `#include <iostream>
#include <vector>
using namespace std;
int partition(vector<int>& a, int lo, int hi) {
    int pivot=a[hi], i=lo-1;
    for(int j=lo;j<hi;j++) if(a[j]<pivot) swap(a[++i],a[j]);
    swap(a[i+1],a[hi]); return i+1;
}
void quickSort(vector<int>& a, int lo, int hi) {
    if(lo<hi){int p=partition(a,lo,hi);quickSort(a,lo,p-1);quickSort(a,p+1,hi);}
}
int main(){vector<int> d={3,6,8,10,1,2,1};quickSort(d,0,d.size()-1);for(int x:d)cout<<x<<" ";}`,
      c: `#include <stdio.h>
void swap(int*a,int*b){int t=*a;*a=*b;*b=t;}
int partition(int a[],int lo,int hi){int p=a[hi],i=lo-1;for(int j=lo;j<hi;j++)if(a[j]<p)swap(&a[++i],&a[j]);swap(&a[i+1],&a[hi]);return i+1;}
void quickSort(int a[],int lo,int hi){if(lo<hi){int p=partition(a,lo,hi);quickSort(a,lo,p-1);quickSort(a,p+1,hi);}}
int main(){int d[]={3,6,8,10,1,2,1};quickSort(d,0,6);for(int i=0;i<7;i++)printf("%d ",d[i]);}`
    }
  },
  'binary-search': {
    name: 'Binary Search', category: 'Searching',
    description: 'Efficient search on sorted array. O(log n) time.',
    templates: {
      python: `def binary_search(arr, target):
    low, high = 0, len(arr) - 1
    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1

arr = [2, 3, 4, 10, 40]
print("Found at index:", binary_search(arr, 10))`,
      javascript: `function binarySearch(arr, target) {
  let low = 0, high = arr.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (arr[mid] === target) return mid;
    else if (arr[mid] < target) low = mid + 1;
    else high = mid - 1;
  }
  return -1;
}
console.log("Found at index:", binarySearch([2, 3, 4, 10, 40], 10));`,
      java: `public class BinarySearch {
    public static int binarySearch(int[] arr, int target) {
        int low = 0, high = arr.length - 1;
        while (low <= high) {
            int mid = (low + high) / 2;
            if (arr[mid] == target) return mid;
            else if (arr[mid] < target) low = mid + 1;
            else high = mid - 1;
        }
        return -1;
    }
    public static void main(String[] args) {
        int[] arr = {2, 3, 4, 10, 40};
        System.out.println("Found at index: " + binarySearch(arr, 10));
    }
}`,
      'c++': `#include <iostream>
#include <vector>
using namespace std;
int binarySearch(vector<int>& arr, int target) {
    int lo=0, hi=arr.size()-1;
    while(lo<=hi){int mid=(lo+hi)/2;if(arr[mid]==target)return mid;else if(arr[mid]<target)lo=mid+1;else hi=mid-1;}
    return -1;
}
int main(){vector<int> a={2,3,4,10,40};cout<<"Found at: "<<binarySearch(a,10);}`,
      c: `#include <stdio.h>
int binarySearch(int arr[],int n,int target){int lo=0,hi=n-1;while(lo<=hi){int mid=(lo+hi)/2;if(arr[mid]==target)return mid;else if(arr[mid]<target)lo=mid+1;else hi=mid-1;}return -1;}
int main(){int a[]={2,3,4,10,40};printf("Found at: %d",binarySearch(a,5,10));}`
    }
  },
  'bfs': {
    name: 'Breadth-First Search', category: 'Graph',
    description: 'Level-order graph traversal. O(V+E) time.',
    templates: {
      python: `from collections import deque

def bfs(graph, start):
    visited = set()
    queue = deque([start])
    visited.add(start)
    result = []
    while queue:
        node = queue.popleft()
        result.append(node)
        for neighbor in graph.get(node, []):
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)
    return result

graph = {0: [1, 2], 1: [2], 2: [0, 3], 3: [3]}
print("BFS:", bfs(graph, 2))`,
      javascript: `function bfs(graph, start) {
  const visited = new Set([start]);
  const queue = [start];
  const result = [];
  while (queue.length > 0) {
    const node = queue.shift();
    result.push(node);
    for (const neighbor of (graph[node] || [])) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  return result;
}
const graph = {0:[1,2], 1:[2], 2:[0,3], 3:[3]};
console.log("BFS:", bfs(graph, 2));`,
      java: `import java.util.*;
public class BFS {
    public static List<Integer> bfs(Map<Integer,List<Integer>> graph, int start) {
        Set<Integer> visited = new HashSet<>();
        Queue<Integer> queue = new LinkedList<>();
        List<Integer> result = new ArrayList<>();
        visited.add(start); queue.add(start);
        while(!queue.isEmpty()){
            int node = queue.poll(); result.add(node);
            for(int neighbor : graph.getOrDefault(node, List.of())){
                if(!visited.contains(neighbor)){visited.add(neighbor);queue.add(neighbor);}
            }
        }
        return result;
    }
    public static void main(String[] args) {
        Map<Integer,List<Integer>> g = Map.of(0,List.of(1,2),1,List.of(2),2,List.of(0,3),3,List.of(3));
        System.out.println("BFS: " + bfs(g, 2));
    }
}`,
      'c++': `#include <iostream>
#include <vector>
#include <queue>
#include <unordered_set>
using namespace std;
void bfs(vector<vector<int>>& graph, int start) {
    unordered_set<int> visited; queue<int> q;
    visited.insert(start); q.push(start);
    while(!q.empty()){int node=q.front();q.pop();cout<<node<<" ";
    for(int n:graph[node])if(!visited.count(n)){visited.insert(n);q.push(n);}}
}
int main(){vector<vector<int>> g={{1,2},{2},{0,3},{3}};bfs(g,2);}`,
      c: `#include <stdio.h>
#include <stdbool.h>
#define MAX 100
int queue[MAX], front=0, rear=0;
bool visited[MAX];
void bfs(int graph[][MAX], int V, int start) {
    visited[start]=true; queue[rear++]=start;
    while(front<rear){int node=queue[front++];printf("%d ",node);
    for(int i=0;i<V;i++)if(graph[node][i]&&!visited[i]){visited[i]=true;queue[rear++]=i;}}
}
int main(){int g[MAX][MAX]={{0,1,1,0},{0,0,1,0},{1,0,0,1},{0,0,0,1}};bfs(g,4,2);}`
    }
  },
  'dfs': {
    name: 'Depth-First Search', category: 'Graph',
    description: 'Recursive/stack-based graph traversal. O(V+E) time.',
    templates: {
      python: `def dfs(graph, start, visited=None):
    if visited is None:
        visited = set()
    visited.add(start)
    print(start, end=' ')
    for neighbor in graph.get(start, []):
        if neighbor not in visited:
            dfs(graph, neighbor, visited)

graph = {0: [1, 2], 1: [2], 2: [0, 3], 3: [3]}
print("DFS:"); dfs(graph, 2)`,
      javascript: `function dfs(graph, start, visited = new Set()) {
  visited.add(start);
  process.stdout.write(start + ' ');
  for (const neighbor of (graph[start] || [])) {
    if (!visited.has(neighbor)) dfs(graph, neighbor, visited);
  }
}
const graph = {0:[1,2], 1:[2], 2:[0,3], 3:[3]};
console.log("DFS:"); dfs(graph, 2);`,
      java: `import java.util.*;
public class DFS {
    static void dfs(Map<Integer,List<Integer>> graph, int node, Set<Integer> visited) {
        visited.add(node); System.out.print(node + " ");
        for(int n : graph.getOrDefault(node, List.of()))
            if(!visited.contains(n)) dfs(graph, n, visited);
    }
    public static void main(String[] args) {
        Map<Integer,List<Integer>> g = Map.of(0,List.of(1,2),1,List.of(2),2,List.of(0,3),3,List.of(3));
        dfs(g, 2, new HashSet<>());
    }
}`,
      'c++': `#include <iostream>
#include <vector>
#include <unordered_set>
using namespace std;
void dfs(vector<vector<int>>& g, int node, unordered_set<int>& visited) {
    visited.insert(node); cout<<node<<" ";
    for(int n:g[node]) if(!visited.count(n)) dfs(g,n,visited);
}
int main(){vector<vector<int>> g={{1,2},{2},{0,3},{3}};unordered_set<int> v;dfs(g,2,v);}`,
      c: `#include <stdio.h>
#include <stdbool.h>
#define MAX 100
bool visited[MAX];
void dfs(int g[][MAX],int V,int node){visited[node]=true;printf("%d ",node);
for(int i=0;i<V;i++)if(g[node][i]&&!visited[i])dfs(g,V,i);}
int main(){int g[MAX][MAX]={{0,1,1,0},{0,0,1,0},{1,0,0,1},{0,0,0,1}};dfs(g,4,2);}`
    }
  },
  'fibonacci': {
    name: 'Fibonacci (Dynamic Programming)', category: 'Dynamic Programming',
    description: 'Compute nth Fibonacci number using memoization. O(n) time.',
    templates: {
      python: `def fibonacci(n, memo={}):
    if n in memo: return memo[n]
    if n <= 1: return n
    memo[n] = fibonacci(n-1, memo) + fibonacci(n-2, memo)
    return memo[n]

# Bottom-up approach
def fibonacci_dp(n):
    if n <= 1: return n
    dp = [0] * (n + 1)
    dp[1] = 1
    for i in range(2, n + 1):
        dp[i] = dp[i-1] + dp[i-2]
    return dp[n]

print("Fib(10):", fibonacci(10))
print("Fib(10) DP:", fibonacci_dp(10))`,
      javascript: `function fibonacci(n, memo = {}) {
  if (n in memo) return memo[n];
  if (n <= 1) return n;
  memo[n] = fibonacci(n - 1, memo) + fibonacci(n - 2, memo);
  return memo[n];
}

function fibonacciDP(n) {
  if (n <= 1) return n;
  const dp = new Array(n + 1).fill(0);
  dp[1] = 1;
  for (let i = 2; i <= n; i++) dp[i] = dp[i-1] + dp[i-2];
  return dp[n];
}
console.log("Fib(10):", fibonacci(10));`,
      java: `import java.util.HashMap;
public class Fibonacci {
    static HashMap<Integer,Long> memo = new HashMap<>();
    public static long fib(int n) {
        if (memo.containsKey(n)) return memo.get(n);
        if (n <= 1) return n;
        long result = fib(n-1) + fib(n-2);
        memo.put(n, result);
        return result;
    }
    public static void main(String[] args) {
        System.out.println("Fib(10): " + fib(10));
    }
}`,
      'c++': `#include <iostream>
#include <unordered_map>
using namespace std;
unordered_map<int,long long> memo;
long long fib(int n){if(memo.count(n))return memo[n];if(n<=1)return n;return memo[n]=fib(n-1)+fib(n-2);}
int main(){cout<<"Fib(10): "<<fib(10);}`,
      c: `#include <stdio.h>
long long fib(int n){long long a=0,b=1;for(int i=2;i<=n;i++){long long t=a+b;a=b;b=t;}return n?b:a;}
int main(){printf("Fib(10): %lld",fib(10));}`
    }
  },
  'knapsack': {
    name: '0/1 Knapsack', category: 'Dynamic Programming',
    description: 'Classic DP problem. O(nW) time, O(nW) space.',
    templates: {
      python: `def knapsack(weights, values, capacity):
    n = len(weights)
    dp = [[0]*(capacity+1) for _ in range(n+1)]
    for i in range(1, n+1):
        for w in range(capacity+1):
            dp[i][w] = dp[i-1][w]
            if weights[i-1] <= w:
                dp[i][w] = max(dp[i][w], dp[i-1][w-weights[i-1]] + values[i-1])
    return dp[n][capacity]

print("Max value:", knapsack([1,3,4,5], [1,4,5,7], 7))`,
      javascript: `function knapsack(weights, values, capacity) {
  const n = weights.length;
  const dp = Array.from({length: n+1}, () => Array(capacity+1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let w = 0; w <= capacity; w++) {
      dp[i][w] = dp[i-1][w];
      if (weights[i-1] <= w)
        dp[i][w] = Math.max(dp[i][w], dp[i-1][w-weights[i-1]] + values[i-1]);
    }
  }
  return dp[n][capacity];
}
console.log("Max value:", knapsack([1,3,4,5], [1,4,5,7], 7));`,
      java: `public class Knapsack {
    public static int knapsack(int[] w, int[] v, int cap) {
        int n = w.length;
        int[][] dp = new int[n+1][cap+1];
        for(int i=1;i<=n;i++)
            for(int j=0;j<=cap;j++){
                dp[i][j]=dp[i-1][j];
                if(w[i-1]<=j) dp[i][j]=Math.max(dp[i][j],dp[i-1][j-w[i-1]]+v[i-1]);
            }
        return dp[n][cap];
    }
    public static void main(String[] a){System.out.println("Max: "+knapsack(new int[]{1,3,4,5},new int[]{1,4,5,7},7));}
}`,
      'c++': `#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;
int knapsack(vector<int>& w, vector<int>& v, int cap){
    int n=w.size(); vector<vector<int>> dp(n+1,vector<int>(cap+1,0));
    for(int i=1;i<=n;i++) for(int j=0;j<=cap;j++){dp[i][j]=dp[i-1][j];if(w[i-1]<=j)dp[i][j]=max(dp[i][j],dp[i-1][j-w[i-1]]+v[i-1]);}
    return dp[n][cap];
}
int main(){vector<int> w={1,3,4,5},v={1,4,5,7};cout<<"Max: "<<knapsack(w,v,7);}`,
      c: `#include <stdio.h>
int max(int a,int b){return a>b?a:b;}
int knapsack(int w[],int v[],int n,int cap){
    int dp[100][100]={0};
    for(int i=1;i<=n;i++)for(int j=0;j<=cap;j++){dp[i][j]=dp[i-1][j];if(w[i-1]<=j)dp[i][j]=max(dp[i][j],dp[i-1][j-w[i-1]]+v[i-1]);}
    return dp[n][cap];
}
int main(){int w[]={1,3,4,5},v[]={1,4,5,7};printf("Max: %d",knapsack(w,v,4,7));}`
    }
  },
  'linked-list': {
    name: 'Linked List', category: 'Data Structures',
    description: 'Singly linked list with insert, delete, search, display.',
    templates: {
      python: `class Node:
    def __init__(self, data):
        self.data = data
        self.next = None

class LinkedList:
    def __init__(self):
        self.head = None

    def append(self, data):
        new_node = Node(data)
        if not self.head:
            self.head = new_node
            return
        current = self.head
        while current.next:
            current = current.next
        current.next = new_node

    def delete(self, key):
        if self.head and self.head.data == key:
            self.head = self.head.next; return
        current = self.head
        while current and current.next:
            if current.next.data == key:
                current.next = current.next.next; return
            current = current.next

    def search(self, key):
        current = self.head
        pos = 0
        while current:
            if current.data == key: return pos
            current = current.next; pos += 1
        return -1

    def display(self):
        elements = []
        current = self.head
        while current:
            elements.append(str(current.data))
            current = current.next
        print(" -> ".join(elements))

ll = LinkedList()
for val in [1, 2, 3, 4, 5]:
    ll.append(val)
ll.display()
ll.delete(3)
ll.display()
print("Search 4:", ll.search(4))`,
      javascript: `class Node {
  constructor(data) { this.data = data; this.next = null; }
}

class LinkedList {
  constructor() { this.head = null; }

  append(data) {
    const node = new Node(data);
    if (!this.head) { this.head = node; return; }
    let curr = this.head;
    while (curr.next) curr = curr.next;
    curr.next = node;
  }

  delete(key) {
    if (this.head?.data === key) { this.head = this.head.next; return; }
    let curr = this.head;
    while (curr?.next) {
      if (curr.next.data === key) { curr.next = curr.next.next; return; }
      curr = curr.next;
    }
  }

  display() {
    const items = []; let curr = this.head;
    while (curr) { items.push(curr.data); curr = curr.next; }
    console.log(items.join(' -> '));
  }
}

const ll = new LinkedList();
[1,2,3,4,5].forEach(v => ll.append(v));
ll.display(); ll.delete(3); ll.display();`,
      java: `public class LinkedList {
    static class Node { int data; Node next; Node(int d){data=d;next=null;} }
    Node head;
    void append(int data){Node n=new Node(data);if(head==null){head=n;return;}Node c=head;while(c.next!=null)c=c.next;c.next=n;}
    void delete(int key){if(head!=null&&head.data==key){head=head.next;return;}Node c=head;while(c!=null&&c.next!=null){if(c.next.data==key){c.next=c.next.next;return;}c=c.next;}}
    void display(){Node c=head;while(c!=null){System.out.print(c.data+(c.next!=null?" -> ":""));c=c.next;}System.out.println();}
    public static void main(String[] a){LinkedList ll=new LinkedList();for(int v:new int[]{1,2,3,4,5})ll.append(v);ll.display();ll.delete(3);ll.display();}
}`,
      'c++': `#include <iostream>
using namespace std;
struct Node { int data; Node* next; Node(int d):data(d),next(nullptr){} };
class LinkedList {
    Node* head=nullptr;
public:
    void append(int d){Node*n=new Node(d);if(!head){head=n;return;}Node*c=head;while(c->next)c=c->next;c->next=n;}
    void remove(int key){if(head&&head->data==key){head=head->next;return;}for(Node*c=head;c&&c->next;c=c->next)if(c->next->data==key){c->next=c->next->next;return;}}
    void display(){for(Node*c=head;c;c=c->next)cout<<c->data<<(c->next?" -> ":"");cout<<endl;}
};
int main(){LinkedList ll;for(int v:{1,2,3,4,5})ll.append(v);ll.display();ll.remove(3);ll.display();}`,
      c: `#include <stdio.h>
#include <stdlib.h>
typedef struct Node{int data;struct Node*next;}Node;
Node*head=NULL;
void append(int d){Node*n=malloc(sizeof(Node));n->data=d;n->next=NULL;if(!head){head=n;return;}Node*c=head;while(c->next)c=c->next;c->next=n;}
void delete(int key){if(head&&head->data==key){head=head->next;return;}for(Node*c=head;c&&c->next;c=c->next)if(c->next->data==key){c->next=c->next->next;return;}}
void display(){for(Node*c=head;c;c=c->next)printf("%d%s",c->data,c->next?" -> ":"");printf("\\n");}
int main(){for(int i=1;i<=5;i++)append(i);display();delete(3);display();}`
    }
  },
  'binary-search-tree': {
    name: 'Binary Search Tree', category: 'Data Structures',
    description: 'BST with insert, search, inorder traversal. O(log n) average.',
    templates: {
      python: `class Node:
    def __init__(self, key):
        self.key = key
        self.left = self.right = None

class BST:
    def __init__(self):
        self.root = None

    def insert(self, key):
        self.root = self._insert(self.root, key)

    def _insert(self, node, key):
        if not node: return Node(key)
        if key < node.key: node.left = self._insert(node.left, key)
        elif key > node.key: node.right = self._insert(node.right, key)
        return node

    def search(self, key):
        return self._search(self.root, key)

    def _search(self, node, key):
        if not node or node.key == key: return node is not None
        if key < node.key: return self._search(node.left, key)
        return self._search(node.right, key)

    def inorder(self):
        result = []
        self._inorder(self.root, result)
        return result

    def _inorder(self, node, result):
        if node:
            self._inorder(node.left, result)
            result.append(node.key)
            self._inorder(node.right, result)

bst = BST()
for val in [50, 30, 70, 20, 40, 60, 80]:
    bst.insert(val)
print("Inorder:", bst.inorder())
print("Search 40:", bst.search(40))`,
      javascript: `class Node {
  constructor(key) { this.key = key; this.left = this.right = null; }
}
class BST {
  constructor() { this.root = null; }
  insert(key) { this.root = this._insert(this.root, key); }
  _insert(node, key) {
    if (!node) return new Node(key);
    if (key < node.key) node.left = this._insert(node.left, key);
    else if (key > node.key) node.right = this._insert(node.right, key);
    return node;
  }
  inorder(node = this.root, result = []) {
    if (node) { this.inorder(node.left, result); result.push(node.key); this.inorder(node.right, result); }
    return result;
  }
}
const bst = new BST();
[50,30,70,20,40,60,80].forEach(v => bst.insert(v));
console.log("Inorder:", bst.inorder());`,
      java: `public class BST {
    static class Node { int key; Node left, right; Node(int k){key=k;} }
    Node root;
    void insert(int key){root=insert(root,key);}
    Node insert(Node n,int key){if(n==null)return new Node(key);if(key<n.key)n.left=insert(n.left,key);else if(key>n.key)n.right=insert(n.right,key);return n;}
    void inorder(Node n){if(n!=null){inorder(n.left);System.out.print(n.key+" ");inorder(n.right);}}
    public static void main(String[] a){BST t=new BST();for(int v:new int[]{50,30,70,20,40,60,80})t.insert(v);t.inorder(t.root);}
}`,
      'c++': `#include <iostream>
using namespace std;
struct Node{int key;Node*left,*right;Node(int k):key(k),left(0),right(0){}};
Node*insert(Node*n,int key){if(!n)return new Node(key);if(key<n->key)n->left=insert(n->left,key);else if(key>n->key)n->right=insert(n->right,key);return n;}
void inorder(Node*n){if(n){inorder(n->left);cout<<n->key<<" ";inorder(n->right);}}
int main(){Node*root=0;for(int v:{50,30,70,20,40,60,80})root=insert(root,v);inorder(root);}`,
      c: `#include <stdio.h>
#include <stdlib.h>
typedef struct Node{int key;struct Node*left,*right;}Node;
Node*newNode(int k){Node*n=malloc(sizeof(Node));n->key=k;n->left=n->right=NULL;return n;}
Node*insert(Node*n,int key){if(!n)return newNode(key);if(key<n->key)n->left=insert(n->left,key);else if(key>n->key)n->right=insert(n->right,key);return n;}
void inorder(Node*n){if(n){inorder(n->left);printf("%d ",n->key);inorder(n->right);}}
int main(){Node*root=NULL;int vals[]={50,30,70,20,40,60,80};for(int i=0;i<7;i++)root=insert(root,vals[i]);inorder(root);}`
    }
  },
  'lcs': {
    name: 'Longest Common Subsequence', category: 'Dynamic Programming',
    description: 'Find LCS of two strings using DP. O(mn) time and space.',
    templates: {
      python: `def lcs(s1, s2):
    m, n = len(s1), len(s2)
    dp = [[0]*(n+1) for _ in range(m+1)]
    for i in range(1, m+1):
        for j in range(1, n+1):
            if s1[i-1] == s2[j-1]:
                dp[i][j] = dp[i-1][j-1] + 1
            else:
                dp[i][j] = max(dp[i-1][j], dp[i][j-1])
    return dp[m][n]

print("LCS length:", lcs("ABCBDAB", "BDCAB"))`,
      javascript: `function lcs(s1, s2) {
  const m = s1.length, n = s2.length;
  const dp = Array.from({length: m+1}, () => Array(n+1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = s1[i-1] === s2[j-1] ? dp[i-1][j-1]+1 : Math.max(dp[i-1][j], dp[i][j-1]);
  return dp[m][n];
}
console.log("LCS length:", lcs("ABCBDAB", "BDCAB"));`,
      java: `public class LCS {
    public static int lcs(String s1, String s2) {
        int m=s1.length(), n=s2.length();
        int[][] dp = new int[m+1][n+1];
        for(int i=1;i<=m;i++) for(int j=1;j<=n;j++)
            dp[i][j] = s1.charAt(i-1)==s2.charAt(j-1) ? dp[i-1][j-1]+1 : Math.max(dp[i-1][j],dp[i][j-1]);
        return dp[m][n];
    }
    public static void main(String[] a){System.out.println("LCS: "+lcs("ABCBDAB","BDCAB"));}
}`,
      'c++': `#include <iostream>
#include <string>
#include <vector>
#include <algorithm>
using namespace std;
int lcs(string s1,string s2){int m=s1.size(),n=s2.size();vector<vector<int>>dp(m+1,vector<int>(n+1,0));
for(int i=1;i<=m;i++)for(int j=1;j<=n;j++)dp[i][j]=s1[i-1]==s2[j-1]?dp[i-1][j-1]+1:max(dp[i-1][j],dp[i][j-1]);return dp[m][n];}
int main(){cout<<"LCS: "<<lcs("ABCBDAB","BDCAB");}`,
      c: `#include <stdio.h>
int max(int a,int b){return a>b?a:b;}
int lcs(char*s1,char*s2,int m,int n){int dp[100][100]={0};
for(int i=1;i<=m;i++)for(int j=1;j<=n;j++)dp[i][j]=s1[i-1]==s2[j-1]?dp[i-1][j-1]+1:max(dp[i-1][j],dp[i][j-1]);return dp[m][n];}
int main(){printf("LCS: %d",lcs("ABCBDAB","BDCAB",7,5));}`
    }
  }
};

function getAlgorithmList() {
  return Object.entries(ALGORITHMS).map(([id, algo]) => ({
    id, name: algo.name, category: algo.category, description: algo.description
  }));
}

function generateCode(algorithmId, language) {
  const algo = ALGORITHMS[algorithmId];
  if (!algo) return { error: 'Algorithm not found' };
  const lang = language.toLowerCase();
  const template = algo.templates[lang];
  if (!template) return { error: `No template for language: ${language}` };
  return { name: algo.name, category: algo.category, description: algo.description, code: template, language: lang };
}

module.exports = { getAlgorithmList, generateCode, ALGORITHMS };
