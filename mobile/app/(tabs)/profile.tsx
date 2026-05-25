import React, { useEffect, useState, useMemo } from 'react';
import { ScrollView, StyleSheet, View, Alert, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator, Avatar, Surface, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/src/core/theme/ThemeProvider';
import { AppInput } from '@/src/shared/ui/AppInput';
import { AppButton } from '@/src/shared/ui/AppButton';
import { getUser } from '@/src/features/auth/services/auth.service';
import { getProfile, updateProfile } from '@/src/features/profile/services/profile.service';
import type { Profile, UpdateProfile } from '@/src/features/profile/types';
import { Role, Area } from '@/src/features/profile/types';

export default function ProfileScreen() {
    const { colors, tokens } = useAppTheme();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState(false);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('');
    const [area, setArea] = useState('');

    useEffect(() => {
        let mounted = true;
        async function load() {
            try {
                const user = await getUser();
                if (!user) {
                    throw new Error('Usuario no autenticado');
                }
                const p = await getProfile(user.email ?? '');
                if (!mounted) return;
                if (p) {
                    setProfile(p);
                    setEmail(p.email ?? user.email ?? '');
                    setRole(p.role ?? '');
                    setArea(p.area ?? '');
                } else {
                    // no profile yet — prefill with auth email
                    setEmail(user.email ?? '');
                }
            } catch (err: any) {
                console.warn('Error cargando perfil', err?.message ?? err);
            } finally {
                if (mounted) setLoading(false);
            }
        }
        void load();
        return () => {
            mounted = false;
        };
    }, []);

    async function handleSave() {
        if (!profile) {
            Alert.alert('Perfil no encontrado', 'No se puede actualizar un perfil inexistente');
            return;
        }
        setSaving(true);
        try {
            // map role and area strings to enums if possible
            const normalize = (s: string) => (s ? s.trim().toUpperCase() : '');
            const roleVal = normalize(role);
            const areaVal = normalize(area);

            const mappedRole = (Object.values(Role) as string[]).includes(roleVal) ? (roleVal as Role) : null;
            const mappedArea = (Object.values(Area) as string[]).includes(areaVal) ? (areaVal as Area) : null;

            const payload: UpdateProfile = {
                email: email || undefined,
                role: mappedRole,
                area: mappedArea,
            };

            const updated = await updateProfile(profile.id, payload);
            setProfile(updated);
            setEditing(false);
        } catch (err: any) {
            Alert.alert('Error', err?.message ?? 'No se pudo guardar');
        } finally {
            setSaving(false);
        }
    }

    const styles = useMemo(() => StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.screenSolid },
        content: { padding: tokens.spacing.lg },
        header: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.md, marginBottom: tokens.spacing.md },
        avatar: { backgroundColor: colors.surfaceTrack },
        title: { ...tokens.typography.title2, color: colors.textHero, marginBottom: 6 },
        subtitle: { ...tokens.typography.body, color: colors.textSubtitle },
        card: {
            padding: tokens.spacing.md,
            backgroundColor: colors.surfaceCard,
            borderRadius: tokens.radius.lg,
            borderWidth: 1,
            borderColor: colors.surfaceCardBorder,
            marginBottom: tokens.spacing.md,
        },
        row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.spacing.sm },
        label: { ...tokens.typography.label, color: colors.textMuted },
        value: { ...tokens.typography.bodyStrong, color: colors.textBody },
        badge: { paddingHorizontal: tokens.spacing.sm, paddingVertical: 6, borderRadius: tokens.radius.md, backgroundColor: colors.surfaceTrack },
        field: { marginBottom: tokens.spacing.md },
        meta: { ...tokens.typography.caption, color: colors.textSubtitle, marginTop: tokens.spacing.xs },
    }), [colors, tokens]);

    const initials = useMemo(() => {
        const source = profile?.email ?? email;
        if (!source) return 'US';
        const name = source.split('@')[0];
        const parts = name.split(/[^a-zA-Z0-9]+/).filter(Boolean);
        const letters = parts.map((p) => p[0]).slice(0, 2).join('');
        return letters.toUpperCase() || 'US';
    }, [profile, email]);

    const displayName = useMemo(() => {
        // try to show a friendly name from the email or role
        if (profile?.email) {
            const name = profile.email.split('@')[0];
            return name.replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        }
        return email.split('@')[0] || 'Usuario';
    }, [profile, email]);

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator animating size={36} />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={{ alignItems: 'center', marginBottom: tokens.spacing.md }}>
                <View style={{ alignItems: 'center' }}>
                    <View style={{
                        width: 120,
                        height: 120,
                        borderRadius: 120 / 2,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 4,
                        borderColor: colors.primary,
                        marginBottom: tokens.spacing.sm,
                    }}>
                        <Avatar.Text size={100} label={initials} style={{ backgroundColor: colors.surfaceCard }} />
                    </View>

                    <TouchableOpacity onPress={() => setEditing(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <MaterialCommunityIcons name="camera-outline" size={18} color={colors.primary} />
                        <Text style={{ color: colors.primary, ...tokens.typography.label }}>Editar foto</Text>
                    </TouchableOpacity>
                </View>

                <Text style={[styles.title, { marginTop: tokens.spacing.md }]}>{displayName}</Text>
                <Text style={styles.subtitle}>{profile?.role ?? 'Sin rol'} · {profile?.area ?? 'Sin área'}</Text>
            </View>

            <Surface style={styles.card}>
                <Text style={{ ...tokens.typography.title3, marginBottom: tokens.spacing.sm, color: colors.textTitle }}>Mi perfil</Text>

                <View style={{ borderTopWidth: 1, borderTopColor: colors.surfaceCardBorder }} />

                <View style={{ paddingVertical: tokens.spacing.md }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: tokens.spacing.sm }}>
                        <Text style={styles.label}>Nombre</Text>
                        <Text style={styles.value}>{displayName}</Text>
                    </View>
                    <Divider />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: tokens.spacing.sm }}>
                        <Text style={styles.label}>E-mail</Text>
                        <Text style={styles.value}>{email}</Text>
                    </View>
                    <Divider />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: tokens.spacing.sm }}>
                        <Text style={styles.label}>Rol</Text>
                        <Text style={styles.value}>{profile?.role ?? '-'}</Text>
                    </View>
                </View>
            </Surface>

            <View style={{ height: tokens.spacing.md }} />

            <Surface style={styles.card}>
                <Text style={{ ...tokens.typography.title3, marginBottom: tokens.spacing.sm, color: colors.textTitle }}>Mi compañía</Text>
                <View style={{ paddingVertical: tokens.spacing.md }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: tokens.spacing.sm }}>
                        <Text style={styles.label}>Área</Text>
                        <Text style={styles.value}>{profile?.area ?? '-'}</Text>
                    </View>
                </View>
            </Surface>

            <View style={{ height: tokens.spacing.lg }} />

            {editing ? (
                <AppButton mode="contained" onPress={handleSave} loading={saving}>
                    Guardar cambios
                </AppButton>
            ) : (
                <AppButton onPress={() => setEditing(true)}>Editar perfil</AppButton>
            )}
        </ScrollView>
    );
}
