// Copyright (c) 2021 Terminus, Inc.
//
// This program is free software: you can use, redistribute, and/or modify
// it under the terms of the GNU Affero General Public License, version 3
// or later ("AGPL"), as published by the Free Software Foundation.
//
// This program is distributed in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
// FITNESS FOR A PARTICULAR PURPOSE.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program. If not, see <http://www.gnu.org/licenses/>.

import * as React from 'react';
import { Tabs, Button, Tooltip } from 'nusi';
import PipelineConfigDetail from './config-detail';
import PipelineRunDetail from './run-detail';
import routeInfoStore from 'app/common/stores/route';
import buildStore from 'application/stores/build';
import fileTreeStore from 'common/stores/file-tree';
import yaml from '@terminus/js-yaml';
import { useUpdate } from 'common';
import { updateSearch } from 'common/utils';
import { useMount } from 'react-use';
import { get, isEmpty, find } from 'lodash';
import { WithAuth, usePerm } from 'user/common';
import appStore from 'application/stores/application';

import { getBranchPath } from './config';
import i18n from 'i18n';

interface IProps{
  nodeId?: string;
  addDrawerProps?: Obj
  scopeParams: {scope: string; scopeID: string};
  scope: string;
}

const PipelineDetail = (props: IProps) => {
  const { nodeId: propsNodeId, addDrawerProps = {}, scope, ...rest } = props || {};
  const [caseDetail] = fileTreeStore.useStore(s => [s.curNodeDetail]);
  const [params, query] = routeInfoStore.useStore(s => [s.params, s.query]);
  const nodeId = propsNodeId || query.nodeId;
  const { branch, path } = getBranchPath(caseDetail);
  const { addPipeline } = buildStore.effects;
  const { clearExecuteRecords } = buildStore.reducers;
  const branchAuthObj = usePerm(s => s.app.repo.branch);
  const branchInfo = appStore.useStore(s => s.branchInfo); // 分支保护信息
  const [{ activeKey, runKey, canRunTest }, updater, update] = useUpdate({
    activeKey: 'configDetail',
    runKey: 1,
    canRunTest: true,
  });

  useMount(() => {
    query.pipelineID && updater.activeKey('runDetail');
  });

  const getAuthByNode = () => {
    const isProtectBranch = get(find(branchInfo, { name: branch }), 'isProtect');
    const branchAuth = isProtectBranch ? branchAuthObj.writeProtected.pass : branchAuthObj.writeNormal.pass;
    const authTip = isProtectBranch ? i18n.t('application:branch is protected, you have no permission yet') : undefined;
    return { hasAuth: branchAuth, authTip };
  };

  const authObj = getAuthByNode();

  const ymlStr = (get(caseDetail, 'meta.pipelineYml') || '');
  let ymlObj = {} as any;
  if (ymlStr) {
    try {
      ymlObj = yaml.load(ymlStr);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
    }
  }
  const hasUseableYml = ymlObj?.stages && !isEmpty(ymlObj?.stages);

  const onCaseChange = (bool: boolean) => {
    updater.canRunTest(bool);
  };

  const addNewPipeline = () => {
    const postData = {
      appID: +params.appId,
      branch,
      pipelineYmlName: path,
      pipelineYmlSource: 'gittar',
      source: 'dice',
    };
    addPipeline(postData).then(() => {
      clearExecuteRecords();
      if (activeKey !== 'runDetail')updater.activeKey('runDetail');
      updateSearch({ pipelineID: undefined });
      updater.runKey((pre: number) => pre + 1);
    });
  };

  return (
    <>
      <Tabs
        tabBarExtraContent={
          canRunTest ? (
            <WithAuth pass={authObj.hasAuth && hasUseableYml} noAuthTip={i18n.t('project:please add valid tasks to the pipeline below before operating')}>
              <Button type="primary" onClick={addNewPipeline}>{i18n.t('application:add pipeline')}</Button>
            </WithAuth>
          ) : (
            <Tooltip title={i18n.t('project:pipeline-run-tip')}>
              <Button type="primary" disabled>{i18n.t('application:add pipeline')}</Button>
            </Tooltip>
          )
        }
        onChange={(aKey: string) => updater.activeKey(aKey)}
        activeKey={activeKey}
        renderTabBar={(p: any, DefaultTabBar) => <DefaultTabBar {...p} onKeyDown={(e:any) => e} />}
      >
        <Tabs.TabPane tab={i18n.t('configuration information')} key={'configDetail'}>
          <PipelineConfigDetail {...rest} onCaseChange={onCaseChange} scope={scope} nodeId={nodeId} addDrawerProps={addDrawerProps} editAuth={authObj} />
        </Tabs.TabPane>
        <Tabs.TabPane tab={i18n.t('execute detail')} key={'runDetail'}>
          <PipelineRunDetail key={runKey} />
        </Tabs.TabPane>
      </Tabs>
    </>
  );
};

export default PipelineDetail;
