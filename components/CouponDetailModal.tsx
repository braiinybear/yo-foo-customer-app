import React from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Fonts, FontSize } from '@/constants/typography';
import { Coupon } from '@/types/coupons';

interface CouponDetailModalProps {
    visible: boolean;
    onClose: () => void;
    coupon: Coupon | null;
    onApply: (code: string) => void;
}

export const CouponDetailModal: React.FC<CouponDetailModalProps> = ({
    visible,
    onClose,
    coupon,
    onApply,
}) => {
    if (!coupon) return null;

    const formatCurrency = (amount: number) => `₹${amount.toFixed(0)}`;

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={styles.container}>
                            {/* Header */}
                            <View style={styles.header}>
                                <Text style={styles.headerTitle}>Coupon Details</Text>
                                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                    <Ionicons name="close" size={24} color={Colors.text} />
                                </TouchableOpacity>
                            </View>

                            {/* Content */}
                            <View style={styles.content}>
                                <View style={styles.couponTagSection}>
                                    <View style={styles.dashedBox}>
                                        <Text style={styles.codeText}>{coupon.code}</Text>
                                    </View>
                                </View>

                                <Text style={styles.offerText}>
                                    {coupon.discountType === 'PERCENTAGE'
                                        ? `${coupon.discountValue}% OFF`
                                        : `Flat ${formatCurrency(coupon.discountValue)} OFF`}
                                </Text>

                                <View style={styles.infoRow}>
                                    <Ionicons name="information-circle-outline" size={18} color={Colors.muted} />
                                    <Text style={styles.infoText}>
                                        {coupon.discountType === 'PERCENTAGE' && coupon.maxDiscount
                                            ? `Maximum discount up to ${formatCurrency(coupon.maxDiscount)}`
                                            : 'No maximum limit'}
                                    </Text>
                                </View>

                                <View style={styles.infoRow}>
                                    <Ionicons name="cart-outline" size={18} color={Colors.muted} />
                                    <Text style={styles.infoText}>
                                        Valid on orders above {formatCurrency(coupon.minOrder)}
                                    </Text>
                                </View>

                                <View style={styles.infoRow}>
                                    <Ionicons name="calendar-outline" size={18} color={Colors.muted} />
                                    <Text style={styles.infoText}>
                                        Valid until {new Date(coupon.validTo).toLocaleDateString()}
                                    </Text>
                                </View>
                            </View>

                            {/* Footer */}
                            <TouchableOpacity
                                style={styles.applyButton}
                                onPress={() => {
                                    onApply(coupon.code);
                                    onClose();
                                }}
                            >
                                <Text style={styles.applyButtonText}>Apply Coupon</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        minHeight: 350,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    headerTitle: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.lg,
        color: Colors.text,
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        gap: 16,
        marginBottom: 32,
    },
    couponTagSection: {
        alignItems: 'center',
        marginBottom: 8,
    },
    dashedBox: {
        borderWidth: 1.5,
        borderColor: Colors.primary,
        borderStyle: 'dashed',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: Colors.primaryLight + '20',
    },
    codeText: {
        fontFamily: Fonts.brandBlack,
        fontSize: 20,
        color: Colors.primary,
        letterSpacing: 1,
    },
    offerText: {
        fontFamily: Fonts.brandBold,
        fontSize: 22,
        color: Colors.text,
        textAlign: 'center',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    infoText: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
    },
    applyButton: {
        backgroundColor: Colors.primary,
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
    },
    applyButtonText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.md,
        color: Colors.white,
    },
});
