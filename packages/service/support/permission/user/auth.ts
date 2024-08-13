import { TeamTmbItemType } from '@fastgpt/global/support/user/team/type';
import { parseHeaderCert } from '../controller';
import { getTmbInfoByTmbId } from '../../user/team/controller';
import { TeamErrEnum } from '@fastgpt/global/common/error/code/team';
import { AuthModeType, AuthResponseType } from '../type';
import { NullPermission } from '@fastgpt/global/support/permission/constant';

/* auth user role  */
export async function authUserPer(props: AuthModeType): Promise<
  AuthResponseType & {
    tmb: TeamTmbItemType;
  }
> {
  const result = await parseHeaderCert(props);
  const tmb = await getTmbInfoByTmbId({ tmbId: result.tmbId });

  if (!tmb.permission.checkPer(props.per ?? NullPermission)) {
    return Promise.reject(TeamErrEnum.unAuthTeam);
  }

  return {
    ...result,
    permission: tmb.permission,
    tmb
  };
}
