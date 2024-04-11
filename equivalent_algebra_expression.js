const { Parser } = require("node-sql-parser");
const parser = new Parser();

const PI = "π";
const SIGMA = "σ";
const UNION = "∪";
const INTERSECTION = "∩";
const DIFFERENCE = "-";
const JOIN = "⨝";
const LEFT_JOIN = "⟕";
const RIGHT_JOIN = "⟖";
const FULL_OUTER_JOIN = "⟗";

class SQLtoRelationalAlgebra {
  constructor() {
    this.conditionMap = new Map();
    this.relationMap = new Map();
  }

  translateSelect(select) {
    return `${PI} (${select.map((column) => column.expr.column).join(", ")})`;
  }

  translateFrom(from) {
    return `${from.map((table) => this.translateJoin(table)).join(" ")}`;
  }

  translateWhere(where) {
    if (!where.left.column) {
      return `(${this.translateWhere(where.left)} ${this.translateOprator(
        where.operator
      )} ${this.translateWhere(where.right)})`;
    } else {
      return `(${where.left.column} ${this.translateOprator(where.operator)} ${
        where.right.value
      })`;
    }
  }

  translateSetOperation(setOperation) {
    switch (setOperation) {
      case "union":
        return UNION;
      case "intersect":
        return INTERSECTION;
      case "minus":
        return DIFFERENCE;
      default:
        return "";
    }
  }

  translateOprator(operator) {
    switch (operator) {
      case "AND":
        return "∧";
      case "OR":
        return "∨";
      default:
        return operator;
    }
  }

  translateJoin(table) {
    switch (table.join) {
      case "INNER JOIN":
        return `${JOIN}  ${table.table}`;
      case "LEFT JOIN":
        return `${LEFT_JOIN}  ${table.table}`;
      case "RIGHT JOIN":
        return `${RIGHT_JOIN}  ${table.table}`;
      case "FULL OUTER JOIN":
        return `${FULL_OUTER_JOIN}  ${table.table}`;
      default:
        return `${table.table}`;
    }
  }

  translateOne(ast) {
    let select = this.translateSelect(ast.columns);
    let from = this.translateFrom(ast.from);
    let where = ast.where ? `${SIGMA} ` + this.translateWhere(ast.where) : "";

    return `${select} ${where} ${from}`;
  }

  encodeAlgebra(algebra) {
    // replace condition with θ1, θ2, θ3, ...
    // replace relation with R, S, T, ...

    let conditionCounter = 1;
    let relationCounter = 1;

    // replace condition with θ1, θ2, θ3, ...
    // ((age > 20) ∧ (gender = Male)) => θ1 ∧ θ2

    let conditionRegex = /\(([^)]+)\)/g;
    let conditions = algebra.match(conditionRegex);
    conditions.forEach((condition) => {
      this.conditionMap.set(`θ${conditionCounter}`, condition);
      algebra = algebra.replace(condition, `θ${conditionCounter}`);
      conditionCounter++;
    });

    // replace relation with R, S, T, ...
    // students => R, teachers => S

    let relationRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
    let relations = algebra.match(relationRegex);
    relations.forEach((relation) => {
      this.relationMap.set(`R${relationCounter}`, relation);
      algebra = algebra.replace(
        new RegExp(`\\b${relation}\\b`, "g"),
        `R${relationCounter}`
      );
      relationCounter++;
    });

    // remove all parenthesis
    algebra = algebra.replace(/[\(\)]/g, "");

    return algebra;
  }

  decodeAlgebra(algebra) {
    // replace θ1, θ2, θ3, ... with condition

    this.conditionMap.forEach((condition, key) => {
      algebra = algebra.replace(key, condition);
    });
    return algebra;
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

    // console.log(algebra);
    // algebra = this.encodeAlgebra(algebra);
    // console.log(algebra);

    // Apply Equivalence Rules
    algebra = `σ θ1 ∧ θ2 (R ⨝ S)`;
    algebra = `σ θ1 (R ⨝ S)`;
    algebra = `π (id, name) R ∪ π (id, name) S`;
    algebra = `σ θ1 ∧ θ2 (R ⨝ S) ∪ σ θ3 ∧ θ4 (T ⨝ U)`;

    // intersection or union than break into two

    if (algebra.includes(UNION) || algebra.includes(INTERSECTION)) {
      let unionIndex = algebra.indexOf(UNION);
      let intersectionIndex = algebra.indexOf(INTERSECTION);

      let setOperationIndex =
        unionIndex !== -1 ? unionIndex : intersectionIndex;

      let setOperation = algebra.substring(
        setOperationIndex,
        setOperationIndex + 1
      );

      let algebra1 = algebra.substring(0, setOperationIndex - 1);
      let algebra2 = algebra.substring(setOperationIndex + 2);

      let allExpressions1 = this.applyEquivalenceRules(algebra1);
      let allExpressions2 = this.applyEquivalenceRules(algebra2);

      let allExpressions = [];

      for (let i = 0; i < allExpressions1.length; i++) {
        for (let j = 0; j < allExpressions2.length; j++) {
          allExpressions.push(
            `${allExpressions1[i]} ${setOperation} ${allExpressions2[j]}`
          );
          allExpressions.push(
            `${allExpressions2[j]} ${setOperation} ${allExpressions1[i]}`
          );
        }
      }
      allExpressions = this.removeDuplicates(allExpressions);
      console.log(allExpressions.length);
      return allExpressions;
    }

    let allExpressions = this.applyEquivalenceRules(algebra);

    // for(let i = 0; i < allExpressions.length; i++){
    //   allExpressions[i] = this.decodeAlgebra(allExpressions[i]);
    // }

    return allExpressions;
  }

  removeDuplicates(arr) {
    arr = [...new Set(arr)];
    for (let i = 0; i < arr.length; i++) {
      arr[i] = arr[i].replace(/\s+/g, " ");
    }
    return arr;
  }

  applyEquivalenceRules(algebra) {
    let equivalentExpressions = [algebra];
    equivalentExpressions = this.applySelectionCascading(equivalentExpressions);
    equivalentExpressions = this.applySelectionCommutativity(
      equivalentExpressions
    );
    equivalentExpressions = this.applyJoinCommutativity(equivalentExpressions);
    equivalentExpressions = this.applySelectionPushdown(equivalentExpressions);
    equivalentExpressions = this.applyProjectionPushdown(equivalentExpressions);
    equivalentExpressions = this.applyProjectionCommutativity(
      equivalentExpressions
    );
    equivalentExpressions = this.applyUnionCommutativity(equivalentExpressions);
    equivalentExpressions = this.applyIntersectionCommutativity(
      equivalentExpressions
    );
    equivalentExpressions = this.removeDuplicates(equivalentExpressions);

    return equivalentExpressions;
  }

  applySelectionCascading(expressions) {
    // Example: σ(θ1 ∧ θ2) (R) => σ θ1 (σ θ2 (R))
    let newExpressions = [];
    for (let expr of expressions) {
      const selectionIndex = expr.indexOf(SIGMA);
      if (selectionIndex !== -1) {
        const conditionIndex = expr.indexOf("∧");
        if (conditionIndex !== -1 && selectionIndex < conditionIndex) {
          const condition1 = expr.substring(selectionIndex + 1, conditionIndex);
          const condition2 = expr.substring(
            conditionIndex + 1,
            expr.indexOf("(", conditionIndex)
          );
          const relation = expr.substring(expr.indexOf("("));
          newExpressions.push(
            `${SIGMA}${condition1} (${SIGMA}${condition2} ${relation})`
          );
        }
      }
    }
    return [...expressions, ...newExpressions];
  }

  applySelectionCommutativity(expressions) {
    // Example: σ θ1 (σ θ2 R) => σ θ2 (σ θ1 R)
    let newExpressions = [];
    for (let expr of expressions) {
      const selectionIndex = expr.indexOf(SIGMA);
      if (selectionIndex !== -1) {
        const innerSelectionIndex = expr.indexOf(SIGMA, selectionIndex + 1);
        if (innerSelectionIndex !== -1) {
          const condition1 = expr.substring(
            selectionIndex + 1,
            expr.indexOf("(", selectionIndex)
          );
          const condition2 = expr.substring(
            innerSelectionIndex + 1,
            innerSelectionIndex + 4
          );
          const relation = expr.substring(
            innerSelectionIndex + 4,
            expr.indexOf(")", innerSelectionIndex)
          );
          newExpressions.push(
            `${SIGMA}${condition2} (${SIGMA}${condition1} ${relation})`
          );
        }
      }
    }
    return [...expressions, ...newExpressions];
  }

  applyJoinCommutativity(expressions) {
    // Example: (R ⨝ S) => (S ⨝ R)
    const newExpressions = [];
    for (let expr of expressions) {
      const joinIndex = expr.indexOf(JOIN);
      if (joinIndex !== -1) {
        const startPart = expr.substring(
          0,
          expr.indexOf("(", Math.max(0, joinIndex - 3))
        );
        const relation1 = expr.substr(
          expr.indexOf("(", Math.max(0, joinIndex - 3)) + 1,
          1
        );
        const relation2 = expr.substring(
          joinIndex + 1,
          expr.indexOf(")", joinIndex)
        );
        const endPart = expr.substring(expr.indexOf(")", joinIndex));
        newExpressions.push(
          `${startPart}(${relation2} ${JOIN} ${relation1})${endPart}`
        );
      }
    }
    return [...expressions, ...newExpressions];
  }

  applySelectionPushdown(expressions) {
    // Example: σ θ1 (R ⨝ S) => (σ θ1 R) ⨝ S
    let newExpressions = [];
    for (let expr of expressions) {
      const selectionIndex = expr.indexOf(SIGMA);
      if (selectionIndex !== -1) {
        const joinIndex = expr.indexOf(JOIN);
        if (joinIndex !== -1 && selectionIndex < joinIndex) {
          const selectionPart = expr.substring(
            selectionIndex,
            expr.indexOf("(", selectionIndex)
          );
          const relation1 = expr.substring(
            expr.indexOf("(", selectionIndex) + 1,
            joinIndex
          );
          const relation2 = expr.substring(
            joinIndex + 1,
            expr.indexOf(")", joinIndex)
          );
          const endPart = expr.substring(expr.indexOf(")", joinIndex) + 1);
          newExpressions.push(
            `(${selectionPart} ${relation1}) ${JOIN} ${relation2}${endPart}`
          );
        }
      }
    }
    return [...expressions, ...newExpressions];
  }

  applyProjectionPushdown(expressions) {
    // Example: π (columns) (R ⨝ S) => (π (columns) R) ⨝ S
    let newExpressions = [];
    for (let expr of expressions) {
      const projectionIndex = expr.indexOf(PI);
      if (projectionIndex !== -1) {
        const joinIndex = expr.indexOf(JOIN);
        if (joinIndex !== -1 && projectionIndex < joinIndex) {
          const projectionPart = expr.substring(projectionIndex);
          const joinPart = expr.substring(0, joinIndex + 1);
          newExpressions.push(`(${projectionPart}) ${JOIN} ${joinPart}`);
        }
      }
    }
    return [...expressions, ...newExpressions];
  }

  applyProjectionCommutativity(expressions) {
    // Example: π (columns) (R ⨝ S) => π (columns) (S ⨝ R)
    let newExpressions = [];
    for (let expr of expressions) {
      const projectionIndex = expr.indexOf(PI);
      if (projectionIndex !== -1) {
        const joinIndex = expr.indexOf(JOIN);
        if (joinIndex !== -1 && projectionIndex < joinIndex) {
          const relation1 = expr.substring(joinIndex + 2);
          const relation2 = expr.substring(0, joinIndex - 1);
          newExpressions.push(
            `${PI}${expr.substring(
              projectionIndex + 1,
              joinIndex
            )} (${relation1} ${JOIN} ${relation2})`
          );
        }
      }
    }
    return [...expressions, ...newExpressions];
  }

  applyUnionCommutativity(expressions) {
    // Example: R ∪ S => S ∪ R
    let newExpressions = [];
    for (let expr of expressions) {
      const unionIndex = expr.indexOf(UNION);
      if (unionIndex !== -1) {
        const relation1 = expr.substring(0, unionIndex - 1);
        const relation2 = expr.substring(unionIndex + 2);
        newExpressions.push(`${relation2} ${UNION} ${relation1}`);
      }
    }
    return [...expressions, ...newExpressions];
  }

  applyIntersectionCommutativity(expressions) {
    // Example: R ∩ S => S ∩ R
    let newExpressions = [];
    for (let expr of expressions) {
      const intersectionIndex = expr.indexOf(INTERSECTION);
      if (intersectionIndex !== -1) {
        const relation1 = expr.substring(0, intersectionIndex - 1);
        const relation2 = expr.substring(intersectionIndex + 2);
        newExpressions.push(`${relation2} ${INTERSECTION} ${relation1}`);
      }
    }
    return [...expressions, ...newExpressions];
  }
}

let translator = new SQLtoRelationalAlgebra();

let sqlStatement =
  "SELECT id, name FROM students WHERE age > 20 AND gender = 'Male'";
// sqlStatement = "SELECT id, name FROM students union SELECT id, name FROM teachers";
let equivalentExpressions = translator.translate(sqlStatement);

console.log("Equivalent Expressions:");
equivalentExpressions.forEach((expression) => {
  console.log(expression);
});
