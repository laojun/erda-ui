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

import React, { useEffect, useState } from 'react';
import { forEach, map } from 'lodash';
import { Tabs } from 'nusi';
import { MachineList } from 'dcos/pages/cluster-dashboard/machine-list';
import InstanceList from './instance-list';
import ResourcesChartList from './resources-chart-list';
import AlarmRecord from './alarm-record';
import ClusterState from 'dataCenter/pages/cluster-manage/cluster-state';
import i18n from 'i18n';

const { TabPane } = Tabs;

interface IProps {
  machineList: any[];
  activedGroup: any;
  isClickState: boolean;
  onActiveMachine(payload: object, key?: string): void;
}

const GroupTabs = ({
  machineList,
  isClickState,
  onActiveMachine,
  activedGroup,
}: IProps) => {
  const [clusters, setClusters] = useState<any[]>([]);
  const [activeKey, setActiveKey] = useState('machine');

  useEffect(() => {
    const clusterHostMap = {};
    forEach(machineList, ({ clusterName, ip }) => {
      clusterHostMap[clusterName] = clusterHostMap[clusterName] ? [...clusterHostMap[clusterName], ip] : [ip];
    });
    setClusters(map(clusterHostMap, (hostIPs, clusterName) => ({
      clusterName,
      hostIPs,
    })));
    if (isClickState) {
      setActiveKey('state');
    } else {
      setActiveKey('machine');
    }
  }, [isClickState, machineList]);

  return (
    <Tabs activeKey={activeKey} onChange={setActiveKey}>
      <TabPane tab={`${i18n.t('dcos:machines')}`} key="machine">
        <MachineList
          machineList={machineList}
          onClickMachine={onActiveMachine}
          onClickInstance={(record: any) => { onActiveMachine(record, 'instance'); }}
        />
      </TabPane>
      <TabPane tab={`${i18n.t('dcos:machine alarm')}`} key="alarm">
        <AlarmRecord clusters={clusters} />
      </TabPane>
      <TabPane tab={`${i18n.t('dcos:resource statistics')}`} key="resource">
        <ResourcesChartList
          machineList={machineList}
          clusters={clusters}
          setActiveKey={setActiveKey}
        />
      </TabPane>
      {/* <TabPane tab="实例列表" key="instance">
        <InstanceList instanceType="all" clusters={clusters} onClickMachine={onActiveMachine} />
      </TabPane> */}
      <TabPane tab={`${i18n.t('dcos:services')}`} key="service">
        <InstanceList instanceType="service" clusters={clusters} />
      </TabPane>
      <TabPane tab={`${i18n.t('dcos:jobs')}`} key="job">
        <InstanceList instanceType="job" clusters={clusters} />
      </TabPane>
      {
        isClickState &&
        <TabPane tab={`${i18n.t('dcos:cluster brief')}`} key="state" >
          <ClusterState clusterName={activedGroup} />
        </TabPane>
      }
    </Tabs>
  );
};

export default GroupTabs;
