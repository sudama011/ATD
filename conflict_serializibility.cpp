/*
check conflict serializability of a concurrent schedule
*/

#include <bits/stdc++.h>
using namespace std;

class Transaction
{
public:
  string id;
  vector<tuple<int, char, char>> operations; // timestamp, operation type and data item
};

class PrecedenceGraph
{
private:
  map<string, list<string>> adjList;

  // item -> list of {Transaction id, operation type}
  unordered_map<char, vector<pair<string, char>>> dataItems;

public:
  void addTransaction(string id, char op, char item)
  {
    if (op == 'W' && !dataItems[item].empty())
    {
      for (auto &i : dataItems[item])
      {
        if (i.first != id)
        {
          adjList[i.first].push_back(id);
        }
      }
    }
    if (op == 'R' && !dataItems[item].empty())
    {
      for (auto &i : dataItems[item])
      {
        if (i.second == 'W' && i.first != id)
        {
          adjList[i.first].push_back(id);
        }
      }
    }
    dataItems[item].push_back(make_pair(id, op));
  }

  bool isCyclicUtil(string v, map<string, bool> &visited, map<string, bool> &recStack)
  {
    if (visited[v] == false)
    {
      visited[v] = true;
      recStack[v] = true;

      for (string i : adjList[v])
      {
        if (!visited[i] && isCyclicUtil(i, visited, recStack))
          return true;
        else if (recStack[i])
          return true;
      }
    }
    recStack[v] = false;
    return false;
  }

  bool isCyclic()
  {
    map<string, bool> visited;
    map<string, bool> recStack;

    for (auto i : adjList)
    {
      string node = i.first;
      if (isCyclicUtil(node, visited, recStack))
        return true;
    }
    return false;
  }
};

int main()
{
  freopen("transactions.txt", "r", stdin);
  vector<Transaction> transactions;
  string line;
  PrecedenceGraph pg;

  int timestamp = 0;
  while (getline(cin, line))
  {
    timestamp++;
    stringstream ss(line);
    Transaction t;
    ss >> t.id;
    string operation;
    while (ss >> operation)
    {
      char op = operation[0];
      char item = operation[2]; // skip the '(' character
      t.operations.push_back({timestamp, op, item});
      pg.addTransaction(t.id, op, item);
    }
    transactions.push_back(t);
  }

  

  if (pg.isCyclic())
  {
    cout << "The schedule is not conflict serializable.\n";
  }
  else
  {
    cout << "The schedule is conflict serializable.\n";
  }

  return 0;
}