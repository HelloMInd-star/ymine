"""
MS-Lab 数学模板模块 (Batch3)
=====================================
严格红线：
  - 仅提供「二元一次方程组」「比例」两套固定模板
  - 只做硬编码公式的数值代入运算，不实现通用解方程能力
  - 不做高斯消元、不做符号运算、不解析任意字符串方程
  - 用户必须显式输入模板所需的全部数值参数
  - 不提供通用求解API（SolverKernelStub 抛 NotImplementedError）

模板定义：
  1. 二元一次方程组（克莱姆法则硬编码代入）:
     {a1}x + {b1}y = {c1}
     {a2}x + {b2}y = {c2}
     x = (c1*b2 - b1*c2) / (a1*b2 - b1*a2)
     y = (a1*c2 - c1*a2) / (a1*b2 - b1*a2)

  2. 比例模板（交叉相乘硬编码代入）:
     {a} : {b} = {c} : x   →   x = b*c / a
     或已知 a/b = c/d，求d: d = b*c / a
"""
from dataclasses import dataclass
from typing import Dict, Optional


@dataclass
class MathResult:
    template: str
    inputs: Dict[str, float]
    outputs: Dict[str, float]
    formula: str
    steps: list
    success: bool
    error: str = ""
    meta: Optional[Dict] = None


TEMPLATE_BINARY_LINEAR = "binary_linear"
TEMPLATE_RATIO = "ratio"

TEMPLATE_REGISTRY = {
    TEMPLATE_BINARY_LINEAR: {
        "name": "二元一次方程组",
        "params": ["a1", "b1", "c1", "a2", "b2", "c2"],
        "formula": "x = (c1·b2 − b1·c2)/(a1·b2 − b1·a2);  y = (a1·c2 − c1·a2)/(a1·b2 − b1·a2)",
        "description": "a1·x + b1·y = c1；a2·x + b2·y = c2（克莱姆法则硬编码代入）",
    },
    TEMPLATE_RATIO: {
        "name": "比例运算",
        "params": ["a", "b", "c"],
        "formula": "x = b·c / a   （由 a:b = c:x 交叉相乘）",
        "description": "a : b = c : x  →  x = b·c / a（交叉相乘硬编码代入）",
    },
}


def solve_binary_linear(a1: float, b1: float, c1: float,
                        a2: float, b2: float, c2: float) -> MathResult:
    """
    二元一次方程组固定模板：
      a1·x + b1·y = c1
      a2·x + b2·y = c2
    仅使用克莱姆法则硬编码公式代入数值，不解析方程、不变形、不做通用消元。
    """
    steps = []
    steps.append(f"方程组：{a1}·x + {b1}·y = {c1}；{a2}·x + {b2}·y = {c2}")
    D = a1 * b2 - b1 * a2
    steps.append(f"系数行列式 D = a1·b2 - b1·a2 = {a1}·{b2} - {b1}·{a2} = {D}")
    if abs(D) < 1e-12:
        return MathResult(
            template=TEMPLATE_BINARY_LINEAR,
            inputs={"a1": a1, "b1": b1, "c1": c1, "a2": a2, "b2": b2, "c2": c2},
            outputs={},
            formula="x = (c1·b2 - b1·c2)/D, y = (a1·c2 - c1·a2)/D",
            steps=steps,
            success=False,
            error=f"系数行列式 D={D}，方程组无解或无穷多解（仅模板硬编码判定，不做进一步求解）",
            meta={"D": D},
        )
    Dx = c1 * b2 - b1 * c2
    Dy = a1 * c2 - c1 * a2
    steps.append(f"Dx = c1·b2 - b1·c2 = {c1}·{b2} - {b1}·{c2} = {Dx}")
    steps.append(f"Dy = a1·c2 - c1·a2 = {a1}·{c2} - {c1}·{a2} = {Dy}")
    x = Dx / D
    y = Dy / D
    steps.append(f"x = Dx/D = {Dx}/{D} = {x}")
    steps.append(f"y = Dy/D = {Dy}/{D} = {y}")
    verify1 = a1 * x + b1 * y
    verify2 = a2 * x + b2 * y
    steps.append(f"验证: {a1}·{x:.6f} + {b1}·{y:.6f} = {verify1:.6f}（期望{c1}）")
    steps.append(f"验证: {a2}·{x:.6f} + {b2}·{y:.6f} = {verify2:.6f}（期望{c2}）")
    return MathResult(
        template=TEMPLATE_BINARY_LINEAR,
        inputs={"a1": a1, "b1": b1, "c1": c1, "a2": a2, "b2": b2, "c2": c2},
        outputs={"x": x, "y": y},
        formula="x = (c1·b2 - b1·c2)/(a1·b2 - b1·a2); y = (a1·c2 - c1·a2)/(a1·b2 - b1·a2)",
        steps=steps,
        success=True,
        meta={"D": D, "Dx": Dx, "Dy": Dy},
    )


def solve_ratio(a: float, b: float, c: float) -> MathResult:
    """
    比例固定模板：a : b = c : x  →  x = b·c / a
    仅使用交叉相乘硬编码公式，不解析任意比例方程。
    """
    steps = []
    steps.append(f"比例式：{a} : {b} = {c} : x")
    if abs(a) < 1e-12:
        return MathResult(
            template=TEMPLATE_RATIO,
            inputs={"a": a, "b": b, "c": c},
            outputs={},
            formula="x = b·c / a",
            steps=steps,
            success=False,
            error="比例外项 a=0，不能做除法（仅模板硬编码判定，不做进一步推导）",
            meta={"a": a},
        )
    x = b * c / a
    steps.append(f"交叉相乘：x = b·c / a = {b}·{c} / {a} = {x}")
    verify_ratio_left = a / b if abs(b) > 1e-12 else float("inf")
    verify_ratio_right = c / x if abs(x) > 1e-12 else float("inf")
    steps.append(f"验证: a/b = {verify_ratio_left:.6f}, c/x = {verify_ratio_right:.6f}")
    return MathResult(
        template=TEMPLATE_RATIO,
        inputs={"a": a, "b": b, "c": c},
        outputs={"x": x},
        formula="x = b·c / a",
        steps=steps,
        success=True,
        meta={"cross_product": b*c},
    )


def list_templates() -> list:
    """返回可用模板清单（list of dict，每项包含tid/name/formula/description/params）"""
    return [dict(tid=k, **v) for k, v in TEMPLATE_REGISTRY.items()]
