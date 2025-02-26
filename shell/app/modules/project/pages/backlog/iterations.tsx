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
import { isEmpty, map } from 'lodash';
import { Button, Spin } from 'nusi';
import { Icon as CustomIcon, useUpdate } from 'common';
import { useEffectOnce } from 'react-use';
import { WithAuth, usePerm } from 'user/common';
import iterationStore from 'project/stores/iteration';
import { IterationItem } from './iteration-item';
import IterationModal from '../iteration/iteration-modal';
import { useLoading } from 'app/common/stores/loading';
import backlog_dd_svg from 'app/images/backlog-dd.svg';
import i18n from 'i18n';

import './iterations.scss';

const Iterations = () => {
  const undoneIterations = iterationStore.useStore(s => s.undoneIterations);
  const [loading] = useLoading(iterationStore, ['getUndoneIterations']);
  const { getUndoneIterations, deleteIteration } = iterationStore.effects;
  const { clearUndoneIterations } = iterationStore.reducers;
  const [{ isAdding }, updater, update] = useUpdate({
    isAdding: false,
    modalVisible: false,
    editIteration: {} as ITERATION.Detail,
  });

  const addAuth = usePerm(s => s.project.iteration.operation.pass);

  useEffectOnce(() => {
    getList();
    return () => {
      clearUndoneIterations();
    };
  });

  const getList = () => {
    getUndoneIterations();
  };

  const onDelete = (val: ITERATION.Detail) => {
    deleteIteration(val.id).then(() => {
      getList();
    });
  };

  const onAdd = () => updater.isAdding(true);


  const onEdit = (val: ITERATION.Detail) => {
    update({
      editIteration: val,
      modalVisible: true,
    });
  };

  const handleClose = (isSave: boolean) => {
    updater.isAdding(false);
    isSave && getList();
  };

  return (
    <div className='backlog-iterations column-flex-box full-height'>
      <div className='backlog-iterations-title  flex-box mb8'>
        <div>
          <span className='bold fz16 mr8'>{i18n.t('project:unfinished iteration')}</span>
          <span className='color-text-desc'>{i18n.t('{num} {type}', { num: undoneIterations.length, type: i18n.t('project:iteration') })}</span>
        </div>
        <div>
          <WithAuth pass={addAuth} >
            <Button className='px8 mt12' onClick={onAdd}>
              <CustomIcon type='cir-add' className='mr4' />
              {i18n.t('add {name}', { name: i18n.t('project:iteration') })}
            </Button>
          </WithAuth>
        </div>
      </div>
      <div className='backlog-iteration-content spin-full-height'>
        <Spin spinning={loading}>
          { isEmpty(undoneIterations) && !isAdding && <EmptyIteration addAuth={addAuth} onAdd={onAdd} />}
          {
            <div className='backlog-iterations-list'>
              {map(undoneIterations, item => (
                <IterationItem data={item} key={item.id} deleteItem={onDelete} onEdit={onEdit} />
              ))}
            </div>
          }
        </Spin>
      </div>
      <IterationModal
        visible={isAdding}
        data={null}
        onClose={handleClose}
      />
    </div>
  );
};


const EmptyIteration = ({ onAdd, addAuth }: { onAdd: () => void, addAuth: boolean }) => (
  <div className='backlog-iterations-empty-holder'>
    <img src={backlog_dd_svg} className='mb12' />
    <div className='fz24 bold my8'>{i18n.t('project:unfinished iteration')}</div>
    <div className='desc'>
      {i18n.t('project:add-iteration-tip1')}
      <WithAuth pass={addAuth} >
        <Button className='px8' size='small' type="primary" ghost onClick={onAdd}>
          <CustomIcon type='cir-add' className='mr4' />
          {i18n.t('add {name}', { name: i18n.t('project:iteration') })}
        </Button>
      </WithAuth>
      {i18n.t('project:add-iteration-tip2')}
    </div>
  </div>
);

export default Iterations;
