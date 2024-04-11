/*
Write a program which shall read the input file containing statistics about the database.
which atleast 5 table and suggest the most cost effective join method between any given 2 relation. 
Program should include all applicable join method.
You may decide input file structure statistics about table.
*/

#include <bits/stdc++.h>
using namespace std;

const int M = 20; // memory size(number of page frames)

struct Table {
    string name;
    int N; // number of rows
    int B; // number of blocks
    int F; // number of rows per block
    bool hasIndex;
};

int NestedLoopJoinCost(const Table& r, const Table& s) {
    if(r.B < M || s.B < M) {
        return r.N + s.N;
    }
    return r.N * s.B + r.B;
}

int BlockNestedLoopJoinCost(const Table& r, const Table& s) {
   return min(r.B, s.B) + r.B*s.B;
}

int IndexNestedLoopJoinCost(const Table& r, const Table& s) {
    if(s.hasIndex) {
        int h = 1 + ceil(log2(s.B));
        int b = 10;
        int c = h + b;
        return r.B + r.N * c;
    }
    return INT_MAX;
}

int SortMergeJoinCost(const Table& r, const Table& s) {
   return 3*r.B + 3*s.B + 2*r.B * ceil(log(r.B/M)/log(M-1)) + 2*s.B * ceil(log(s.B/M)/log(M-1));
}

int HashJoinCost(const Table& r, const Table& s) {
    int nh = M-2;
    if(nh>ceil(s.B/M)){
        return 3*(r.B+s.B) + 4*nh;
    }
    return INT_MAX;
}


vector<Table> readInputFile(const string& filename) {
    vector<Table> tables;
    ifstream file(filename);
    string line;

    while (getline(file, line)) {
        istringstream iss(line);
        Table t;
        string indexExists;

        if (!(iss >> t.name >> t.N >> t.F >> indexExists)) { 
            break;
        }
        t.hasIndex = (indexExists == "true");
        t.B = ceil((double)t.N/ t.F);
        tables.push_back(t);
    }

    file.close();
    return tables;
}

int main() {
    vector<Table> tables = readInputFile("statistics.txt");

    string r="Orders", s="Products";
    cout<<"Available tables are: ";
    for (auto table : tables) {
        cout << table.name << " ";
    }

    cout << "\nEnter the names of the two tables: ";
    // cin >> r >> s;

    Table R, S;

    for (auto table : tables) {
        if (table.name == r) {
            R = table;
        }
        if (table.name == s) {
            S = table;
        }
    }

    vector<pair<string, int>> joinCosts = {
        {"Nested Loop Join", NestedLoopJoinCost(R, S)},
        {"Block Nested Loop Join", BlockNestedLoopJoinCost(R, S)},
        {"Index Nested Loop Join", IndexNestedLoopJoinCost(R, S)},
        {"Sort Merge Join", SortMergeJoinCost(R, S)},
        {"Hash Join", HashJoinCost(R, S)}
    };


    for(auto joinCost : joinCosts) {
        cout << joinCost.first << " cost: " << joinCost.second << endl;
    }

    int min_i = 0;
    for(int i=1;i<joinCosts.size();i++){
        if(joinCosts[i].second<joinCosts[min_i].second){
            min_i = i;
        }
    }
    cout << "Most cost effective join method between " << r << " and " << s << " is " << joinCosts[min_i].first << endl;

    return 0;
}