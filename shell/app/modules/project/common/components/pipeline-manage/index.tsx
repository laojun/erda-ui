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
import { SplitPage } from 'layout/common';
import { EmptyHolder } from 'common';
import PipelineDetail from './pipeline-detail';
import routeInfoStore from 'app/common/stores/route';
import FileTree from './file-tree';
import './index.scss';

interface IProps{
  scope: string;
}

const PipelineManage = (props: IProps) => {
  const { scope } = props;
  const caseId = routeInfoStore.useStore(s => s.query.caseId);
  return (
    <SplitPage>
      <SplitPage.Left className='pipeline-manage-left'>
        <FileTree scope={scope} />
      </SplitPage.Left>
      <SplitPage.Right>
        {
          caseId ? <PipelineDetail key={caseId} scope={scope} /> : <EmptyHolder relative />
        }
      </SplitPage.Right>
    </SplitPage>
  );
};

export default PipelineManage;
