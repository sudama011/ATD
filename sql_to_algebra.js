/* design and implement a translator which shall translate a given select statement of sql into equivalent expression in relation algebra.
your translator shall include selection, projection and set opration. */

const { Parser } = require("node-sql-parser");
const parser = new Parser();
let sqlStatement, ast;

class SQLtoRelationalAlgebra {
  constructor() { }

  translateSelect(select) {
    return `π (${select.map((column) => column.expr.column).join(", ")})`;
  }

  translateFrom(from) {
    return `(${from.map((table) => this.translateJoin(table)).join(" ")})`;
  }

  translateWhere(where) {
    return `σ (${where.left.column} ${where.operator} ${where.right.value})`;
  }

  translateSetOperation(setOperation) {
    switch (setOperation) {
      case "union":
        return "∪";
      case "intersect":
        return "∩";
      case "minus":
        return "-";
      default:
        return "";
    }
  }

  translateJoin(table) {
    switch (table.join) {
      case 'INNER JOIN':
        return `⨝  ${table.table}`;
      case 'LEFT JOIN':
        return `⟕  ${table.table}`;
      case 'RIGHT JOIN':
        return `⟖  ${table.table}`;
      case 'FULL OUTER JOIN':
        return `⟗  ${table.table}`;
      default:
        return `${table.table}`;
    }
  }

  translateOne(ast) {
    let select = this.translateSelect(ast.columns);
    let from = this.translateFrom(ast.from);
    let where = ast.where ? this.translateWhere(ast.where) : "";

    return `${select} ${where} ${from}`;
  }

  translate(sql) {
    let ast = parser.astify(sql);
    // console.log(ast);

    if (ast.type !== "select") {
      throw new Error("Only SELECT and UNION statements are supported");
    }

    let algebra = this.translateOne(ast);

    if (ast.set_op) {
      let algebra2 = this.translateOne(ast._next);
      let set_op = this.translateSetOperation(ast.set_op);
      algebra = `${algebra} ${set_op} ${algebra2}`;
    }
    return algebra;

  }
}

let translator = new SQLtoRelationalAlgebra();
sqlStatement =
  "SELECT id,name FROM students WHERE age > 20 UNION SELECT id,name FROM teachers WHERE age > 30";

sqlStatement = "SELECT * FROM students LEFT JoIN teachers";
console.log(translator.translate(sqlStatement));