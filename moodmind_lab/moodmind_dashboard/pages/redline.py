"""红线验证页 — 动态验证39个私有接口全部抛 NotImplementedError"""
import streamlit as st
from private_engine_stub import (
    PrivateKernelNotImplementedError,
    HighPrecision128Stub, VectorEngineStub, IPDPIDControllerStub,
    LightingEngineStub, KMPEngineStub, SphereRiskEngineStub, MarketOperatorStub,
)


def page_redline():
    st.markdown('<div class="section-title">🔴 Batch1 红线强制验证面板</div>', unsafe_allow_html=True)
    st.markdown('<div class="section-desc">REDLINE VERIFICATION · 39个私有接口实时自检</div>', unsafe_allow_html=True)

    stub_classes = [
        ("HighPrecision128（128bit高精度，8方法）", HighPrecision128Stub, [
            ("precise_vector_dot", [[1.0]*11, [1.0]*11]),
            ("precise_risk_magnitude", [[1.0]*11]),
            ("precise_kelly_coefficient", [0.5, 2.0]),
            ("precise_integral", [[1.0,2.0,3.0], 5]),
            ("precise_derivative", [[1.0,2.0,3.0], 5]),
            ("precise_deviation", [100.0, 95.0]),
            ("precise_phase_angle", [[1.0]*10]),
            ("precise_lps_build", [[1.0,2.0,1.0,2.0]]),
        ]),
        ("VectorEngine（11维向量引擎，11方法）", VectorEngineStub, [
            ("calc_d0_subject", [{}]),
            ("calc_d1_action", [{}]),
            ("calc_d2_attribute", [{}]),
            ("calc_d3_disturbance", [{}]),
            ("calc_d4_price_deviation", [100.0, 95.0]),
            ("calc_d5_integral", [[1.0]*5]),
            ("calc_d6_derivative", [[1.0]*5]),
            ("calc_d7_chip_box", [{}]),
            ("calc_d8_cycle_phase", [{}]),
            ("calc_d9_kelly", [0.5, 2.0]),
            ("calc_d10_sphere_risk", [[1.0]*11]),
        ]),
        ("IPDPIDController（PID自控，3方法）", IPDPIDControllerStub, [
            ("pid_iterate", [0.1, 0.2, 0.05, 0.0, 0.1]),
            ("auto_adjust_weights", [[]]),
            ("convergence_check", [[0.01]*5]),
        ]),
        ("LightingEngine（四维光照，5方法）", LightingEngineStub, [
            ("calc_l1_liquidity_weight", [{}]),
            ("calc_l2_sentiment_weight", [{}]),
            ("calc_l3_policy_weight", [{}]),
            ("calc_l4_prosperity_weight", [{}]),
            ("dynamic_weight_fusion", [0.25,0.25,0.25,0.25,"normal"]),
        ]),
        ("KMPEngine（KMP匹配，5方法）", KMPEngineStub, [
            ("build_lps_array", [[1.0,2.0,1.0]]),
            ("kmp_search", [[1.0]*10, [1.0,2.0]]),
            ("pattern_similarity", [[1.0]*5, [1.0]*5]),
            ("cycle_detection", [[1.0]*10]),
            ("homologous_pattern_mining", [[], 0.7]),
        ]),
        ("SphereRiskEngine（球面风控，3方法）", SphereRiskEngineStub, [
            ("solve_hypersphere_magnitude", [[1.0]*11]),
            ("threshold_judge", [0.5]),
            ("fuse_trigger_check", [0.5, {}]),
        ]),
        ("MarketOperator（市场算子，4方法）", MarketOperatorStub, [
            ("calc_pivot_price", [{}]),
            ("calc_chip_distribution", [[]]),
            ("calc_market_phase", [{}]),
            ("calc_kelly_position", [{}]),
        ]),
    ]

    if st.button("🔴 执行红线自检（动态调用所有39个私有接口）", type="primary"):
        total = 0
        ni_count = 0
        for class_name, cls, methods in stub_classes:
            st.markdown(f"**{class_name}**")
            instance = cls()
            for method_name, args in methods:
                total += 1
                try:
                    getattr(instance, method_name)(*args)
                    st.markdown(f'<div class="notimpl-card" style="background:rgba(231,76,60,0.2);border-left-color:#c0392b;">❌ {method_name}() 未抛出异常 — <b>违反红线</b></div>', unsafe_allow_html=True)
                except PrivateKernelNotImplementedError:
                    ni_count += 1
                    st.markdown(f'<div class="notimpl-card"><span class="ni-name">🔴 {method_name}()</span> → NotImplementedError ✓</div>', unsafe_allow_html=True)
                except Exception as e:
                    st.markdown(f'<div class="notimpl-card" style="background:rgba(243,156,18,0.15);border-left-color:#f39c12;">⚠️ {method_name}() → {type(e).__name__}: {str(e)[:80]}</div>', unsafe_allow_html=True)
        st.divider()
        if ni_count == total:
            st.success(f"✅ 红线验证通过：全部 {total} 个私有接口均正确抛出 NotImplementedError。")
        else:
            st.error(f"❌ 红线违规：{ni_count}/{total} 接口抛 NotImplementedError，{total-ni_count} 个未抛。")
    else:
        st.info("👆 点击上方按钮开始动态自检，每个私有接口会被真实调用，验证是否正确抛出 NotImplementedError。")
        total = sum(len(m[2]) if isinstance(m, tuple) else len(m[1]) for m in [(None,None,c[2]) for c in stub_classes])
        st.markdown(f"待验证接口总数：**{sum(len(c[2]) for c in stub_classes)}** 个")
