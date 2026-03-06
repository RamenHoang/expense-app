import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { Text, Card, Button, FAB, useTheme, Avatar, IconButton, Chip } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useFamilyStore } from '../../../store/familyStore';
import { useNavigation } from '@react-navigation/native';
import { LoadingScreen } from '../../../components/LoadingScreen';
import { formatDistanceToNow } from 'date-fns';
import { vi, enUS } from 'date-fns/locale';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export const FamilyScreen = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const theme = useTheme();
  const {
    family,
    members,
    invitations,
    myInvitations,
    isLoading,
    fetchFamily,
    fetchMembers,
    fetchInvitations,
    fetchMyInvitations,
    leaveFamily,
    deleteFamily,
    removeMember,
    acceptInvitation,
    rejectInvitation,
  } = useFamilyStore();

  const [refreshing, setRefreshing] = useState(false);
  const locale = i18n.language === 'vi' ? vi : enUS;

  useEffect(() => {
    loadFamilyData();
  }, []);

  const loadFamilyData = async () => {
    setRefreshing(true);
    await fetchFamily();
    await fetchMyInvitations();
    setRefreshing(false);
  };

  useEffect(() => {
    if (family) {
      fetchMembers(family.id);
      fetchInvitations(family.id);
    }
  }, [family]);

  const handleCreateFamily = () => {
    (navigation as any).navigate('CreateFamily');
  };

  const handleInviteMember = () => {
    if (family) {
      (navigation as any).navigate('InviteMember', { familyId: family.id });
    }
  };

  const handleLeaveFamily = () => {
    if (!family) return;

    Alert.alert(
      t('family.leaveFamily'),
      t('family.confirmLeave'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('family.leaveFamily'),
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveFamily(family.id);
              Alert.alert(t('common.success'), t('family.leftFamily'));
            } catch (error: any) {
              Alert.alert(t('common.error'), error.message);
            }
          },
        },
      ]
    );
  };

  const handleDeleteFamily = () => {
    if (!family) return;

    Alert.alert(
      t('family.deleteFamily'),
      t('family.confirmDelete'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFamily(family.id);
              Alert.alert(t('common.success'), t('family.familyDeleted'));
            } catch (error: any) {
              Alert.alert(t('common.error'), error.message);
            }
          },
        },
      ]
    );
  };

  const handleRemoveMember = (memberId: string, memberEmail: string) => {
    Alert.alert(
      t('family.removeMember'),
      t('family.confirmRemove'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await removeMember(memberId);
              Alert.alert(t('common.success'), t('family.memberRemoved'));
            } catch (error: any) {
              Alert.alert(t('common.error'), error.message);
            }
          },
        },
      ]
    );
  };

  const handleAcceptInvitation = async (token: string) => {
    try {
      await acceptInvitation(token);
      Alert.alert(t('common.success'), t('family.invitationAccepted'));
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message);
    }
  };

  const handleRejectInvitation = async (invitationId: string) => {
    try {
      await rejectInvitation(invitationId);
      Alert.alert(t('common.success'), t('family.invitationRejected'));
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message);
    }
  };

  const currentUserMember = members.find((m) => m.status === 'active');
  const isOwner = currentUserMember?.role === 'owner';

  if (isLoading && !family && !refreshing) {
    return <LoadingScreen />;
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return theme.colors.primary;
      case 'admin':
        return theme.colors.secondary;
      default:
        return theme.colors.outline;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadFamilyData} />
        }
      >
        {/* My Invitations */}
        {myInvitations.length > 0 && (
          <Card style={styles.card}>
            <Card.Title
              title={t('family.pendingInvitations')}
              titleStyle={{ fontSize: 16, fontWeight: 'bold' }}
              left={(props) => <MaterialCommunityIcons name="email-outline" size={24} />}
            />
            <Card.Content>
              {myInvitations.map((invitation) => (
                <View key={invitation.id} style={styles.invitationItem}>
                  <View style={styles.invitationInfo}>
                    <Text style={styles.familyName}>{invitation.family?.name}</Text>
                    <Text style={styles.expiresAt}>
                      {t('family.expiresAt')}{' '}
                      {formatDistanceToNow(new Date(invitation.expires_at), {
                        addSuffix: true,
                        locale,
                      })}
                    </Text>
                  </View>
                  <View style={styles.invitationActions}>
                    <Button
                      mode="contained"
                      onPress={() => handleAcceptInvitation(invitation.token)}
                      style={styles.acceptButton}
                    >
                      {t('family.accept')}
                    </Button>
                    <Button
                      mode="outlined"
                      onPress={() => handleRejectInvitation(invitation.id)}
                    >
                      {t('family.reject')}
                    </Button>
                  </View>
                </View>
              ))}
            </Card.Content>
          </Card>
        )}

        {/* Family Info */}
        {family ? (
          <>
            <Card style={styles.card}>
              <Card.Title
                title={family.name}
                titleStyle={{ fontSize: 20, fontWeight: 'bold' }}
                left={(props) => (
                  <Avatar.Icon {...props} icon="account-group" size={40} />
                )}
                right={(props) =>
                  isOwner ? (
                    <IconButton
                      {...props}
                      icon="cog"
                      onPress={() =>
                        (navigation as any).navigate('EditFamily', { familyId: family.id })
                      }
                    />
                  ) : null
                }
              />
              <Card.Content>
                <Text style={styles.memberCount}>
                  {members.filter((m) => m.status === 'active').length} {t('family.members')}
                </Text>
              </Card.Content>
              <Card.Actions>
                {isOwner ? (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Button onPress={handleInviteMember} icon="account-plus">
                      {t('family.inviteMember')}
                    </Button>
                    <Button onPress={handleDeleteFamily} textColor={theme.colors.error}>
                      {t('family.deleteFamily')}
                    </Button>
                  </View>
                ) : (
                  <Button onPress={handleLeaveFamily} textColor={theme.colors.error}>
                    {t('family.leaveFamily')}
                  </Button>
                )}
              </Card.Actions>
            </Card>

            {/* Members List */}
            <Card style={styles.card}>
              <Card.Title
                title={t('family.members')}
                titleStyle={{ fontSize: 16, fontWeight: 'bold' }}
              />
              <Card.Content>
                {members
                  .filter((m) => m.status === 'active')
                  .map((member) => (
                    <View key={member.id} style={styles.memberItem}>
                      <Avatar.Text
                        size={40}
                        label={member.user?.email?.charAt(0).toUpperCase() || 'U'}
                      />
                      <View style={styles.memberInfo}>
                        <Text style={styles.memberEmail} numberOfLines={1} ellipsizeMode="tail">
                          {member.user?.email}
                        </Text>
                        <Chip
                          mode="outlined"
                          style={[styles.roleChip, { borderColor: getRoleColor(member.role) }]}
                          textStyle={{ 
                            color: getRoleColor(member.role), 
                            fontSize: 11,
                            fontWeight: '600'
                          }}
                          compact
                        >
                          {t(`family.${member.role}`)}
                        </Chip>
                      </View>
                      {isOwner && member.role !== 'owner' && (
                        <IconButton
                          icon="close"
                          size={20}
                          onPress={() => handleRemoveMember(member.id, member.user?.email || '')}
                        />
                      )}
                    </View>
                  ))}
              </Card.Content>
            </Card>

            {/* Pending Invitations */}
            {invitations.length > 0 && (
              <Card style={styles.card}>
                <Card.Title
                  title={t('family.pendingInvitations')}
                  titleStyle={{ fontSize: 16, fontWeight: 'bold' }}
                />
                <Card.Content>
                  {invitations.map((invitation) => (
                    <View key={invitation.id} style={styles.pendingInvitation}>
                      <MaterialCommunityIcons name="email-outline" size={20} color={theme.colors.primary} />
                      <Text style={styles.invitationEmail}>{invitation.email}</Text>
                      <Text style={styles.invitationExpires}>
                        {formatDistanceToNow(new Date(invitation.expires_at), {
                          addSuffix: true,
                          locale,
                        })}
                      </Text>
                    </View>
                  ))}
                </Card.Content>
              </Card>
            )}
          </>
        ) : (
          <Card style={styles.card}>
            <Card.Content style={styles.noFamilyContent}>
              <MaterialCommunityIcons name="account-group-outline" size={64} color={theme.colors.outline} />
              <Text style={styles.noFamilyTitle}>{t('family.noFamily')}</Text>
              <Text style={styles.noFamilyDesc}>{t('family.createFamilyDesc')}</Text>
              <Button mode="contained" onPress={handleCreateFamily} style={styles.createButton}>
                {t('family.createFamily')}
              </Button>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      {family && isOwner && (
        <FAB
          icon="account-plus"
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          onPress={handleInviteMember}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    margin: 16,
    marginBottom: 8,
  },
  memberCount: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 4,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingRight: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  memberEmail: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  roleChip: {
    alignSelf: 'flex-start',
  },
  invitationItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  invitationInfo: {
    marginBottom: 12,
  },
  familyName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  invitedBy: {
    fontSize: 13,
    opacity: 0.7,
    marginBottom: 2,
  },
  expiresAt: {
    fontSize: 12,
    opacity: 0.6,
  },
  invitationActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    flex: 1,
  },
  pendingInvitation: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  invitationEmail: {
    flex: 1,
    fontSize: 14,
  },
  invitationExpires: {
    fontSize: 12,
    opacity: 0.6,
  },
  noFamilyContent: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noFamilyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  noFamilyDesc: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    minWidth: 200,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
