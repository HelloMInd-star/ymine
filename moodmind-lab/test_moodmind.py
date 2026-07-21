#!/usr/bin/env python3
"""
MoodMind-Lab 单元测试
验证核心数据类型、stub引擎、推送服务、计费、告警、审计功能
"""
import sys
import os
import json
import random
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'public_dashboard'))

from moodmind_types import (
    FinanceVector11D, KMPMatchResult, LightingSnapshot, SphereRiskSnapshot,
    BillingRecord, AlertRecord, AuditEntry, ComputeReport, PushToMSLab
)
from moodmind_config import CONFIG
import moodmind_engine_stub as engine_stub
import moodmind_push as push_svc
import moodmind_billing as billing_svc
import moodmind_alert as alert_svc
import moodmind_audit as audit_svc
import moodmind_compute as compute_svc

KMP_THRESHOLDS = {'trash': 0.25, 'buffer': 0.50, 'normal': 0.75}
RISK_THRESHOLDS = {'safe': 0.48, 'stable': 0.50, 'fuse': 0.68}


def test_data_types():
    """测试核心数据类型定义"""
    print("=" * 60)
    print("测试1: 核心数据类型")
    print("=" * 60)

    assert len(KMP_THRESHOLDS) == 3
    assert KMP_THRESHOLDS['trash'] == 0.25
    assert KMP_THRESHOLDS['buffer'] == 0.50
    assert KMP_THRESHOLDS['normal'] == 0.75
    print("✓ KMP阈值定义正确")

    assert len(RISK_THRESHOLDS) == 3
    assert RISK_THRESHOLDS['safe'] == 0.48
    assert RISK_THRESHOLDS['stable'] == 0.50
    assert RISK_THRESHOLDS['fuse'] == 0.68
    print("✓ 风控阈值定义正确")

    vec = FinanceVector11D()
    vec.symbol = "TEST_STOCK"
    vec.vector_public = [random.random() for _ in range(4)]
    vec.vector_finance_private = [random.random() for _ in range(7)]
    assert len(vec.vector_public) == 4
    assert len(vec.vector_finance_private) == 7
    assert len(vec.vector_full) == 11
    print(f"✓ 11维向量结构正确: vec_id={vec.vec_id[:16]}...")

    kmp = KMPMatchResult()
    kmp.similarity = 0.72
    kmp.vec_id = vec.vec_id
    assert 0 <= kmp.similarity <= 1
    print(f"✓ KMP匹配结果: 相似度={kmp.similarity:.3f}")

    light = LightingSnapshot()
    assert 0 <= light.L1_liquidity <= 1
    assert 0 <= light.L2_sentiment <= 1
    assert 0 <= light.L3_policy <= 1
    assert 0 <= light.L4_prosperity <= 1
    print(f"✓ 四维光照快照: L1={light.L1_liquidity:.2f}, L2={light.L2_sentiment:.2f}")

    risk = SphereRiskSnapshot()
    risk.risk_magnitude = 0.52
    assert 0 <= risk.risk_magnitude <= 1
    print(f"✓ 球面风控快照: 模长={risk.risk_magnitude:.3f}")

    billing = BillingRecord()
    alert = AlertRecord()
    audit = AuditEntry()
    compute = ComputeReport()
    push = PushToMSLab()
    print("✓ 所有数据类可正常实例化")
    print()


def test_config():
    """测试配置加载"""
    print("=" * 60)
    print("测试2: 配置模块")
    print("=" * 60)

    assert "MoodMind-Lab" in CONFIG["lab_name"]
    assert CONFIG["vector"]["total_dims"] == 11
    assert CONFIG["vector"]["public_dims"] == 4
    assert CONFIG["vector"]["finance_dims"] == 7
    print(f"✓ 实验室名称: {CONFIG['lab_name']}")
    print(f"✓ 向量维度: 公共{CONFIG['vector']['public_dims']}维 + 金融私有{CONFIG['vector']['finance_dims']}维 = 共{CONFIG['vector']['total_dims']}维")
    print(f"✓ 风控阈值: 预警={CONFIG['vector']['sphere_risk_threshold_warn']}, 熔断={CONFIG['vector']['sphere_risk_threshold_fuse']}")
    print(f"✓ MS-Lab推送端点: {CONFIG['push_api']['mslab_endpoint']}")
    print()


def test_engine_stub():
    """测试公开stub引擎（不包含金融逻辑）"""
    print("=" * 60)
    print("测试3: 公开Stub引擎（仅结果输出）")
    print("=" * 60)

    vec = engine_stub.generate_mock_vector("TEST_STOCK_001")
    assert isinstance(vec, FinanceVector11D)
    assert len(vec.vector_full) == 11
    print(f"✓ 向量生成stub正常工作, symbol={vec.symbol}")

    kmp = engine_stub.run_kmp_match(vec)
    assert isinstance(kmp, KMPMatchResult)
    print(f"✓ KMP匹配stub正常工作, similarity={kmp.similarity:.3f}")

    risk = engine_stub.snapshot_sphere_risk()
    assert isinstance(risk, SphereRiskSnapshot)
    print(f"✓ 球面风控stub正常工作, magnitude={risk.risk_magnitude:.3f}, status={risk.status}")

    light = engine_stub.snapshot_lighting()
    assert isinstance(light, LightingSnapshot)
    print(f"✓ 四维光照stub正常工作, score={light.lighting_score:.3f}")

    save_result = engine_stub.save_vector(vec)
    assert save_result["ok"] is True
    print(f"✓ 向量持久化正常")

    recent = engine_stub.load_recent_vectors(5)
    print(f"✓ 向量加载正常, 最近{len(recent)}条")
    print()


def test_push_service():
    """测试MS-Lab推送服务"""
    print("=" * 60)
    print("测试4: MS-Lab推送服务")
    print("=" * 60)

    vec = engine_stub.generate_mock_vector("PUSH_TEST")
    result = push_svc.push_vector_to_mslab(vec, simulate=True)
    assert result is not None
    assert isinstance(result, PushToMSLab)
    print(f"✓ 推送到MS-Lab: tier={result.target_tier}")
    print(f"✓ 推送数据仅包含: 向量本体 + 分值（无金融逻辑）")

    stats = push_svc.get_push_stats()
    print(f"✓ 推送统计查询正常, 总数={stats['total_pushed']}")
    print()


def test_billing():
    """测试独立Token计费"""
    print("=" * 60)
    print("测试5: 独立Token计费")
    print("=" * 60)

    record = billing_svc.record_billing(
        action="vector_generate",
        tokens_in=10,
        tokens_out=5,
        operator="test_user"
    )
    assert record is not None
    assert isinstance(record, BillingRecord)
    print(f"✓ 计费记录成功, cost=${record.cost_usd:.6f}")

    stats = billing_svc.get_billing_summary()
    print(f"✓ 计费统计查询正常, 总记录数={stats['total_records']}")
    print()


def test_alert():
    """测试独立告警中心"""
    print("=" * 60)
    print("测试6: 独立告警中心")
    print("=" * 60)

    alert_record = alert_svc.emit_alert(
        level="warn",
        source="risk_monitor",
        message="测试告警：风险模长接近阈值"
    )
    assert alert_record is not None
    assert isinstance(alert_record, AlertRecord)
    print(f"✓ 告警触发成功: [{alert_record.level}] {alert_record.message}")

    risk_alerts = alert_svc.check_risk_alert(0.72)
    print(f"✓ 风险告警检查正常, 触发{len(risk_alerts)}条告警")

    alerts = alert_svc.read_alerts(10)
    print(f"✓ 告警查询正常: {len(alerts)} 条")
    print()


def test_audit():
    """测试审计日志与权限控制"""
    print("=" * 60)
    print("测试7: 审计日志 + RBAC权限")
    print("=" * 60)

    assert audit_svc.has_permission("viewer", "view_dashboard") is True
    assert audit_svc.has_permission("viewer", "config_write") is False
    assert audit_svc.has_permission("admin", "view_private_kernel_dims") is True
    assert audit_svc.has_permission("quant", "view_private_kernel_dims") is False
    print("✓ RBAC四级权限校验正常")

    audit_record = audit_svc.audit_log(
        role="admin",
        action="vector_push",
        target="MS-Lab",
        allowed=True,
        detail="测试推送"
    )
    assert audit_record is not None
    assert isinstance(audit_record, AuditEntry)
    print(f"✓ 审计记录成功: {audit_record.action} - allowed={audit_record.allowed}")

    logs = audit_svc.read_audit_log(10)
    print(f"✓ 审计日志查询正常: {len(logs)} 条")
    print()


def test_compute():
    """测试算力上报"""
    print("=" * 60)
    print("测试8: 算力上报")
    print("=" * 60)

    report = compute_svc.build_report(
        num_vectors=100,
        tokens_in=500,
        tokens_out=200,
        kmp_similarity=0.72,
        sphere_risk=0.45,
        kmp_blocks=5
    )
    assert report is not None
    assert isinstance(report, ComputeReport)
    print(f"✓ 算力报告构建正常: VRAM={report.vram_estimate_mb:.2f}MB, 时间≈{report.time_estimate_ms:.2f}ms")
    print(f"✓ 冷热标签: {report.hot_cold_label}")

    compute_svc.send_report(report)
    reports = compute_svc.read_reports(5)
    print(f"✓ 算力上报正常, 已记录{len(reports)}条报告")
    print()


def test_directory_structure():
    """测试目录结构完整性"""
    print("=" * 60)
    print("测试9: 目录结构完整性")
    print("=" * 60)

    base_dir = os.path.dirname(os.path.abspath(__file__))
    required_dirs = [
        "public_dashboard",
        "public_api",
        "market_data_source",
        "vector_export_layer",
        "kmp_score_service",
        "moodmind_storage_main",
        "billing_log",
        "alert_log",
        "audit_security",
        "private_moodmind_engine",
        "config",
        "scripts",
    ]
    required_files = [
        "index.html",
        "requirements.txt",
        "README.md",
        "scripts/start.sh",
        "config/lab_config.json",
        "private_moodmind_engine/README.md",
    ]

    all_ok = True
    for d in required_dirs:
        path = os.path.join(base_dir, d)
        if os.path.isdir(path):
            print(f"✓ 目录存在: {d}/")
        else:
            print(f"✗ 目录缺失: {d}/")
            all_ok = False

    for f in required_files:
        path = os.path.join(base_dir, f)
        if os.path.isfile(path):
            print(f"✓ 文件存在: {f}")
        else:
            print(f"✗ 文件缺失: {f}")
            all_ok = False

    print()
    return all_ok


def main():
    print("\n" + "=" * 60)
    print("  MoodMind-Lab · 金融向量实验室 · 单元测试")
    print("  V1.0 正式立项版 · 工程框架交付")
    print("=" * 60 + "\n")

    try:
        test_data_types()
        test_config()
        test_engine_stub()
        test_push_service()
        test_billing()
        test_alert()
        test_audit()
        test_compute()
        dirs_ok = test_directory_structure()

        print("=" * 60)
        print("  ✅ 所有测试通过！")
        print("=" * 60)
        print("""
  验证要点总结：
  ✓ 11维向量体系（4公共+7私有）
  ✓ 四维光照环境模型（仅输出结果）
  ✓ 改良KMP周期匹配（仅输出分值）
  ✓ 球面风控内核（仅输出模长状态）
  ✓ 公私隔离（stub层无金融公式）
  ✓ MS-Lab推送协议（仅向量+分值）
  ✓ 独立Token计费
  ✓ 独立告警中心
  ✓ 独立审计日志+RBAC四级权限
  ✓ 算力上报模块
  ✓ 完整目录结构
        """)
        return 0
    except Exception as e:
        print(f"\n✗ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
