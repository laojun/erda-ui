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

import { Spin, Button, Select, Input, message, Alert } from 'nusi';
import { Icon as CustomIcon, EmptyHolder, Avatar, FormModal, IF, DeleteConfirm } from 'common';
import * as React from 'react';
import { fromNow } from 'common/utils';
import { mergeRepoPathWith } from './util';
import GotoCommit from 'application/common/components/goto-commit';
import { Link } from 'react-router-dom';
import i18n from 'i18n';
import { debounce } from 'lodash';
import { SelectValue } from 'interface/common';
import { usePerm, WithAuth } from 'app/user/common';
import './repo-tag.scss';
import repoStore from 'application/stores/repo';
import appStore from 'application/stores/application';
import { useLoading } from 'common/stores/loading';

const { Option } = Select;
const { Search } = Input;

const RepoTag = () => {
  const [visible, setVisible] = React.useState(false);
  const [info, tagList] = repoStore.useStore(s => [s.info, s.tag]);
  const { getListByType, deleteTag, createTag, checkCommitId } = repoStore.effects;
  const { clearListByType } = repoStore.reducers;
  const [isFetching] = useLoading(repoStore, ['getListByType']);
  const { gitRepoAbbrev } = appStore.useStore(s => s.detail);
  const { isLocked } = info;

  const repoBranchAuth = usePerm(s => s.app.repo.branch);

  const download = (tag: string, format: string) => window.open(`/api/repo/${gitRepoAbbrev}/archive/${tag}.${format}`);

  React.useEffect(() => {
    getListByType({ type: 'tag' });
    return () => {
      clearListByType('tag');
    };
  }, [getListByType, clearListByType]);

  const onCreateTag = (tagInfo: { ref: string, tag: string, message: string }) => {
    createTag(tagInfo).then((res: any) => {
      if (!res.success) {
        message.error(i18n.t('application:failed to add tag'));
        return;
      }
      message.success(i18n.t('project:create label success'));
      setVisible(false);
    });
  };

  const RefComp = ({ form }: { form: any }) => {
    const refType = form.getFieldValue('refType');
    const refValue = form.getFieldValue('ref');
    const curForm = React.useRef(form);
    const { branches } = info;
    React.useEffect(() => {
      curForm.current.setFieldsValue({ ref: undefined });
    }, [curForm, refType]);

    const options = refType === 'commitId' ? null : branches;

    const handleSelectChange = (e: SelectValue) => {
      form.setFieldsValue({ ref: e.toString() });
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      form.setFieldsValue({ ref: e.target.value });
    };

    return (
      <div>
        <IF check={options}>
          <Select
            showSearch
            value={refValue}
            optionFilterProp="children"
            onChange={handleSelectChange}
            filterOption={(input, option: any) => option.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0}
          >
            {options && options.map((option: string) => (
              <Option key={option} value={option}>{option}</Option>
            ))}
          </Select>
          <IF.ELSE />
          <Input
            type="text"
            value={refValue}
            maxLength={40}
            onChange={handleTextChange}
          />
        </IF>
      </div>
    );
  };

  const beforeSubmit = async (values: { ref: string, refType: string }) => {
    if (values.refType === 'commitId') {
      const ret = await checkCommitId({ commitId: values.ref });
      if (ret === 'error') {
        message.error(i18n.t('application:invalid commit SHA'));
        return null;
      }
    }
    return values;
  };

  const getList = debounce((tag: string) => {
    getListByType({ type: 'tag', findTags: tag });
  }, 300);

  const handleChangeBranchName = (e:React.ChangeEvent<HTMLInputElement>) => {
    getList(e.target.value);
  };


  const fieldsList = [
    {
      label: i18n.t('application:source type'),
      name: 'refType',
      type: 'radioGroup',
      initialValue: 'branch',
      options: [{ name: 'Branch', value: 'branch' }, { name: 'commit SHA', value: 'commitId' }],
    },
    {
      label: i18n.t('application:based on'),
      name: 'ref',
      type: 'custom',
      getComp: ({ form }: any) => RefComp({ form }),
    },
    {
      label: i18n.t('dcos:label'),
      name: 'tag',
      itemProps: {
        maxLength: 50,
      },
      rules: [
        {
          validator: (_rule: any, value: string, callback: Function) => {
            if (!/^[A-Za-z0-9._-]+$/.test(value)) {
              callback(i18n.t('application:add-tag-form-name-valid'));
            } else {
              callback();
            }
          },
        },
      ],
    },
    {
      label: i18n.t('description'),
      name: 'message',
      required: false,
      type: 'textArea',
      itemProps: {
        autoComplete: 'off',
        maxLength: 1024,
      },
    },
  ];

  return (
    <Spin spinning={isFetching}>
      <div className="top-button-group">
        <WithAuth pass={repoBranchAuth.addTag.pass}>
          <Button disabled={isLocked} type="primary" onClick={() => setVisible(true)}>
            {i18n.t('dcos:add label')}
          </Button>
        </WithAuth>
        <FormModal
          visible={visible}
          name={i18n.t('application:tag')}
          fieldsList={fieldsList}
          onOk={onCreateTag}
          onCancel={() => setVisible(false)}
          beforeSubmit={beforeSubmit}
        />
      </div>
      <Search
        className="repo-tag-search-input mb16"
        placeholder={i18n.t('common:search by {name}', { name: i18n.t('application:tag') })}
        onChange={handleChangeBranchName}
      />
      <div className="repo-tag-list">
        <IF check={isLocked}>
          <Alert message={i18n.t('lock-repository-tip')} type="error" />
        </IF>
        <IF check={tagList.length}>
          {tagList.map((item) => {
            const { name, id, tagger } = item;
            const { name: committerName, when } = tagger as any;
            return (
              <div key={name} className="branch-item flex-box">
                <div className="branch-item-left">
                  <div className="bold-500 v-align fz16 mb12">
                    <CustomIcon type="bb" />
                    <Link to={mergeRepoPathWith(`/tree/${name}`)}><span className="color-text hover-active">{name}</span></Link>
                  </div>
                  <div className="v-align color-text-sub">
                    <span className="inline-v-align"><Avatar showName name={committerName} />&nbsp;{i18n.t('committed at')}</span>
                    <span className="ml4">{fromNow(when)}</span>
                    <span className="ml24 color-text-desc nowrap flex-1">
                      <GotoCommit length={6} commitId={id} />
                    </span>
                  </div>
                </div>
                <div className="branch-item-right">
                  <Button className="ml12" onClick={() => download(name, 'zip')}>{i18n.t('application:download zip')}</Button>
                  <Button className="ml12" onClick={() => download(name, 'tar.gz')}>{i18n.t('application:download tar.gz')}</Button>
                  <DeleteConfirm
                    onConfirm={() => {
                      deleteTag({ tag: name });
                    }}
                  >
                    <WithAuth pass={repoBranchAuth.deleteTag.pass}>
                      <Button disabled={isLocked} className="ml12" ghost type="danger">{i18n.t('delete')}</Button>
                    </WithAuth>
                  </DeleteConfirm>
                </div>
              </div>
            );
          })}
          <IF.ELSE />
          <EmptyHolder relative style={{ justifyContent: 'start' }} />
        </IF>
      </div>
    </Spin>
  );
};

export default RepoTag;
