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

// 此部分逻辑基本拷贝原来逻辑，方便后面如果整体删除原来代码
import * as React from 'react';
import { Drawer, Form, Button, Input, InputNumber, Icon, Collapse, Alert, Spin, Select, Tooltip } from 'nusi';
import { FormComponentProps } from 'antd/es/form';
import i18n from 'i18n';
import { cloneDeep, map, isEmpty, omit, pick, get, filter, head, transform, isEqual, forEach, find } from 'lodash';
import VariableInput from 'application/common/components/object-input-group';
import ListInput from 'application/common/components/list-input-group';
import { useUpdate, Icon as CustomIcon } from 'common';
import appDeployStore from 'application/stores/deploy';
import { useLoading } from 'app/common/stores/loading';
import ActionSelect from './action-select';
import { getResource, getDefaultVersionConfig, mergeActionAndResource } from '../utils';
import './pipeline-node-drawer.scss';

const { Item } = Form;
const { Panel } = Collapse;
const { Option } = Select;

export const i18nMap = {
  version: i18n.t('version'),
  params: i18n.t('application:task params'),
  resources: i18n.t('application:running resources'),
  commands: i18n.t('application:task commands'),
  image: i18n.t('image'),
};

export interface IEditStageProps {
  nodeData: any;
  editing: boolean;
  isCreate?: boolean;
  otherTaskAlias?: string[];
  onSubmit?: (options: any) => void;
}
const noop = () => {};
const PurePipelineNodeForm = (props: IEditStageProps & FormComponentProps) => {
  const { nodeData: propsNodeData, editing, isCreate, otherTaskAlias = [], form, onSubmit: handleSubmit = noop } = props;
  const { getActionConfigs, getGroupActions } = appDeployStore.effects;
  const [groupActions, actionConfigs] = appDeployStore.useStore(s => [s.groupActions, s.actionConfigs]);
  const [loading] = useLoading(appDeployStore, ['getActionConfigs']);
  const { getFieldDecorator, getFieldValue } = form;
  const [{ actions, actionConfig, resource, originType, originName, task }, updater, update] = useUpdate({
    actions: [] as DEPLOY.ExtensionAction[],
    resource: {},
    actionConfig: {} as DEPLOY.ActionConfig | {},
    originType: null as null | string,
    originName: null as null | string,
    task: {} as IStageTask | {},
  });

  React.useEffect(() => {
    if (propsNodeData && !isEmpty(propsNodeData)) {
      update({
        originName: propsNodeData.alias,
        originType: propsNodeData.type,
        task: propsNodeData,
      });
    }
  }, [propsNodeData, update]);

  React.useEffect(() => {
    if (propsNodeData && !isEmpty(propsNodeData)) {
      const _type = get(propsNodeData, 'type');
      _type && getActionConfigs({ actionType: _type }).then(res => {
        let config;
        if (res.length > 0) {
          config = propsNodeData.version ? res.find(c => c.version === propsNodeData.version) : getDefaultVersionConfig(res);
        }
        const newResource = getResource(propsNodeData, config);
        update({
          resource: newResource,
          actionConfig: config || {},
        });
      });
    }
  }, [getActionConfigs, propsNodeData, update]);

  React.useEffect(() => {
    if (isCreate) {
      updater.actionConfig({});
    }
  }, [isCreate, updater]);

  React.useEffect(() => {
    if (isEmpty(groupActions)) {
      getGroupActions();
    }
    const actionArr = [] as DEPLOY.ExtensionAction[];
    map(groupActions.action || [], (item) => {
      map(item.items, (subItem) => {
        actionArr.push({ ...subItem, group: item.name, groupDisplayName: item.displayName });
      });
    });
    updater.actions(actionArr);
  }, [getGroupActions, groupActions, updater]);

  if (!isCreate && isEmpty(actionConfig)) {
    return null;
  }

  const type = actionConfig.type || getFieldValue('resource.type');
  const taskInitName = originType === actionConfig.name ? originName : (otherTaskAlias.includes(actionConfig.name) ? undefined : actionConfig.name);

  const changeResourceType = (value: string) => {
    const action = actions.find((a: any) => a.name === value);
    if (action) {
      getActionConfigs({ actionType: action.name }).then((result: DEPLOY.ActionConfig[]) => {
        const config = getDefaultVersionConfig(result);
        const mergedResource = mergeActionAndResource(config, {} as any);
        update({
          resource: {
            ...resource,
            ...mergedResource,
          },
          actionConfig: config || {},
        });
      });
    }
  };

  const checkResourceName = (_rule: any, value: string, callback: any) => {
    const name = form.getFieldValue('resource.alias');

    if (!value) {
      return callback(i18n.t('application:please enter the task name'));
    }
    if (otherTaskAlias.includes(name)) {
      return callback(i18n.t('application:there is the same name action!'));
    }
    callback();
  };

  const changeActionVersion = (version: any) => {
    const selectConfig = actionConfigs.find(config => config.version === version) as DEPLOY.ActionConfig;
    updater.actionConfig(selectConfig);
    updater.resource(getResource(task as IStageTask, selectConfig));
  };

  const taskType = getFieldDecorator('resource.type', {
    initialValue: task.type,
    rules: [
      {
        required: true,
        message: `${i18n.t('application:please choose')}Task Type`,
      },
    ],
  })(
    <ActionSelect
      disabled={!editing}
      label={i18n.t('task type')}
      actions={actions}
      onChange={changeResourceType}
      placeholder={`${i18n.t('application:please choose task type')}`}
    />
  );

  const actionVersion = getFieldDecorator('resource.version', {
    initialValue: task.version || actionConfig.version,
    rules: [
      {
        required: true,
        message: `${i18n.t('application:please choose')}Task Version`,
      },
    ],
  })(
    <Select
      disabled={!editing}
      onChange={changeActionVersion}
      placeholder={`${i18n.t('application:please choose version')}`}
    >
      { actionConfigs.map(config => (<Option key={config.version} value={config.version}>{config.version}</Option>)) }
    </Select >
  );

  let alert;
  if (!isCreate && !actionConfig.type) {
    alert = (
      <Alert
        className="addon-error-tag"
        showIcon
        message={i18n.t('application:the current action does not exist, please re-select!')}
        type="error"
      />
    );
  }
  const taskName = getFieldDecorator('resource.alias', {
    initialValue: taskInitName,
    rules: [
      {
        required: true,
        validator: checkResourceName,
      },
    ],
  })(<Input autoFocus={!type} disabled={!editing} placeholder={i18n.t('application:please enter the task name')} />);

  const renderTaskTypeStructure = () => {
    if (isEmpty(resource)) {
      return null;
    }
    const { getFieldsValue } = form;
    const resourceForm = getFieldsValue(['resource.alias', 'resource.type']);
    if (!resourceForm.resource.type) {
      return null;
    }

    return renderResource(resource, 'resource');
  };

  const getDataValue = (dataSource: any, key: string) => {
    return dataSource ? dataSource[key] : null;
  };

  const renderResource = (resourceParam: any, parentKey?: string, dataSource?: any) => {
    if (resourceParam.data instanceof Array) {
      return resourceParam.data.map((item: any) => {
        const inputKey = parentKey ? `${parentKey}.${item.name}` : `${item.name}`;
        return renderObject(item, inputKey, getDataValue(dataSource, item.name));
      });
    }
    const { params, image, resources } = resourceParam.data;

    const parentObjectData = getDataValue(dataSource, 'params');
    const paramsContent = map(params, (value: any, itemKey: string) => {
      const inputKey = parentKey ? `${parentKey}.params.${itemKey}` : `params.${itemKey}`;
      return renderObject(value, inputKey, getDataValue(parentObjectData, itemKey));
    });

    return (
      <>
        {
          actionConfig.name === 'custom-script' ? (
            <div>
              { renderObject(image, 'resource.image', getDataValue(dataSource, 'image')) }
            </div>
          ) : null
        }
        <div>
          <div className="resource-input-group-title">{i18nMap.params}: </div>
          { paramsContent }
        </div>
        <div>
          { renderObject(resources, 'resource.resources', getDataValue(dataSource, 'resources')) }
        </div>
      </>
    );
  };

  const renderObject = (value: any, parentKey: string, dataSource?: any) => {
    if (!isObject(value.type)) {
      return renderPropertyValue(value, parentKey, dataSource);
    }

    if (value.type === 'string_array') {
      return renderStringArray(value, parentKey);
    }

    if (value.type === 'struct_array') {
      return renderStructArray(value, parentKey);
    }

    if (value.type === 'map') {
      return renderMap(value, parentKey, dataSource);
    }

    const content = renderResource({ data: value.struct }, parentKey, dataSource);
    if (!content || !Object.values(content).some(c => c)) return null;

    return (
      <div key={parentKey}>
        <span className="resource-input-group-title">{i18nMap[value.name] || value.name}: </span>
        <div>
          {content}
        </div>
      </div>
    );
  };

  const renderMap = (value: any, parentKey: string, dataSource?: any) => {
    let initialValue = isCreate ? value.default : (value.value || value.default);

    if (dataSource) {
      initialValue = dataSource;
    }

    if (!editing && !initialValue) {
      return null;
    }

    const inputField = getFieldDecorator(parentKey, {
      initialValue,
      rules: [
        {
          required: value.required,
          message: i18n.t('application:this item cannot be empty'),
        },
      ],
    })(<VariableInput disabled={!editing} label={getLabel(value.name, value.desc)} />);
    return (
      <Item key={parentKey}>{inputField}</Item>
    );
  };

  const renderStringArray = (value: any, parentKey: string) => {
    const inputField = getFieldDecorator(parentKey, {
      initialValue: isCreate ? value.default : (value.value || value.default),
      rules: [
        {
          required: value.required,
          message: i18n.t('application:this item cannot be empty'),
        },
      ],
    })(<ListInput disabled={!editing} label={getLabel(value.name, value.desc)} />);
    return (
      <Item key={parentKey}>{inputField}</Item>
    );
  };

  const renderPropertyValue = (value: any, parentKey: string, dataSource?: any) => {
    let input;
    let initialValue = isCreate ? value.default : (value.value || value.default);

    if (dataSource) {
      initialValue = dataSource;
    }

    if (!editing && !initialValue) {
      return null;
    }

    const unit = value.unit ? <span>{value.unit}</span> : null;

    switch (value.type) {
      case 'float':
      case 'int':
        input = <InputNumber disabled={!editing || value.readOnly} className="full-width" placeholder={i18n.t('application:please enter data')} />;
        break;
      default:
        input = <Input disabled={!editing || value.readOnly} placeholder={i18n.t('application:please enter data')} addonAfter={unit} />;
        break;
    }

    const inputField = getFieldDecorator(parentKey, {
      initialValue,
      rules: [
        {
          required: value.required,
          message: i18n.t('application:this item cannot be empty'),
        },
      ],
    })(input);
    return (
      <Item key={parentKey} label={getLabel(value.name, value.desc)}>{inputField}</Item>
    );
  };

  const getLabel = (label: string, labelTip: string) => {
    let _label: any = label;
    if (labelTip) {
      _label = (
        <span>
          {_label}&nbsp;
          <Tooltip title={labelTip}>
            <Icon type="question-circle-o" className='color-text-icon' />
          </Tooltip>
        </span>
      );
    }
    return _label;
  };

  const renderStructArray = (property: any, parentKey: string) => {
    if ((!editing && !property.value) || (!editing && property.value && !property.value.length)) {
      return null;
    }

    const addBtn = editing ?
      <Icon type="plus" onClick={() => addNewItemToStructArray(property, property.struct[0])} /> : null;
    // getFieldDecorator(`${parentKey}-data`, { initialValue: property.value || [] });
    const data = property.value || []; // getFieldValue(`${parentKey}-data`);
    const realData = getFieldValue(`${parentKey}`) || [];
    const content = data.map((item: any, index: number) => {
      const keys = Object.keys(item);
      const curItem = realData[index] || item;
      const nameKey = get(property.struct, '[0].name');
      const headName = curItem[nameKey]
        || (typeof curItem[keys[0]] === 'string' ? curItem[keys[0]] : 'module');
      const header = (
        <div>
          <span>{headName}</span>
          {editing ?
            <CustomIcon
              onClick={() => deleteItemFromStructArray(property, index, parentKey)}
              className="icon-delete"
              type="sc1"
            /> : null}
        </div>
      );
      return (
        <Panel key={`${parentKey}.${item.key}-${String(index)}`} header={header}>
          {renderResource({ data: property.struct }, `${parentKey}[${index}]`, item)}
        </Panel>
      );
    });

    return (
      <div key={parentKey}>
        <span className="resource-input-group-title">
          {property.name}:
          {addBtn}
        </span>
        {data.length ? (
          <Collapse
            className="collapse-field"
            accordion
          >
            {content}
          </Collapse>
        ) : null}
      </div>
    );
  };

  const deleteItemFromStructArray = (property: any, index: number, parentKey: string) => {
    if (!property.value) {
      // eslint-disable-next-line no-param-reassign
      property.value = [];
    }
    property.value.splice(index, 1);
    updater.resource(cloneDeep(resource));

    const formDatas = form.getFieldValue(`${parentKey}`);
    formDatas.splice(index, 1);

    form.setFieldsValue({
      [parentKey]: formDatas,
    });
  };

  const addNewItemToStructArray = (property: any, struct: any) => {
    if (!property.value) {
      // eslint-disable-next-line no-param-reassign
      property.value = [];
    }
    property.value.push({
      [struct.name]: `module-${property.value.length + 1}`,
    });
    updater.resource(cloneDeep(resource));
  };

  const isObject = (inputType: string) => {
    return ['map', 'string_array', 'struct_array', 'struct'].includes(inputType);
  };

  const onSubmit = () => {
    form.validateFieldsAndScroll((error: any, values: any) => {
      if (!error) {
        let data = cloneDeep(values);
        const action = actions.find((a: any) => a.name === get(data, 'resource.type')) || {};
        const resources = head(filter(resource.data, (item) => item.name === 'resources'));
        const originResource = transform(get(resources, 'struct'), (result, item: { name: string, default: string | number }) => {
          const { name, default: d } = item;
          // eslint-disable-next-line no-param-reassign
          result[name] = +d;
        }, {});
        const editedResources = get(data, 'resource.resources') || {};
        forEach(Object.entries(editedResources), ([key, value]) => { editedResources[key] = +(value as string); });
        const isResourceDefault = isEqual(editedResources, originResource);

        if (isResourceDefault) {
          data = omit(data, ['resource.resources']);
        }

        const _type = get(values, 'resource.type');
        if (_type === 'custom-script') {
          // 自定义任务，如果镜像值跟默认的一直，则不保存这个字段；
          const defaultImg = get(find(resource.data, { name: 'image' }), 'default');
          if (defaultImg === get(data, 'resource.image')) {
            data = omit(data, ['resource.image']);
          }
        }
        const filledFieldsData = clearEmptyField(data);
        const resData = { ...filledFieldsData, action } as any;
        if (data.executionCondition)resData.executionCondition = data.executionCondition;
        handleSubmit(resData);
      }
    });
  };

  const clearEmptyField = (ObjData: any) => {
    const filledFields: string[] = [];
    const findData = (obj: any, parentArray: string[]) => {
      Object.keys(obj).forEach((key) => {
        const currentParent = [...parentArray, key];
        const value = get(obj, key);
        if (typeof value === 'object' && value !== null) {
          findData(value, currentParent);
        } else if (value || value === 0) {
          filledFields.push(currentParent.join('.'));
        }
      });
    };
    findData(ObjData, []);
    return pick(ObjData, filledFields);
  };

  const executionCondition = getFieldDecorator('executionCondition', {
    initialValue: get(propsNodeData, 'if') || undefined,
    rules: [
      {
        required: false,
      },
    ],
  })(<Input disabled={!editing} placeholder={i18n.t('common:configure execution conditions')} />);

  return (
    <Spin spinning={loading}>
      <Form className="edit-service-container">
        {alert}
        <Item>{taskType}</Item>
        {type ? <Item label={i18n.t('application:mission name')}>{taskName}</Item> : null}
        <Item label={i18nMap.version}>{actionVersion}</Item>
        <Item label={i18n.t('common:execution conditions')}>{executionCondition}</Item>
        {renderTaskTypeStructure()}
        {editing ? <Button type="primary" ghost onClick={onSubmit}>{i18n.t('application:save')}</Button> : null}
      </Form>
    </Spin>
  );
};

export const PipelineNodeForm = Form.create()(PurePipelineNodeForm);

export interface IPipelineNodeDrawerProps extends IEditStageProps{
  closeDrawer: () => void;
  visible: boolean;
}
const PipelineNodeDrawer = (props: IPipelineNodeDrawerProps) => {
  const { nodeData: propsNodeData, editing, closeDrawer, visible, isCreate } = props;
  let title = '';
  if (isCreate) {
    title = i18n.t('application:new node');
  } else {
    title = `${editing ? i18n.t('edit') : i18n.t('common:view')} ${get(propsNodeData, 'alias') || ''}`;
  }
  const [key, setKey] = React.useState(1);

  React.useEffect(() => {
    setKey(prev => prev + 1);
  }, [visible]);

  return (
    <Drawer
      className='yml-node-drawer'
      title={title}
      visible={visible}
      width={560}
      onClose={closeDrawer}
    >
      <PipelineNodeForm key={key} {...props as any} />
    </Drawer>
  );
};

export default PipelineNodeDrawer;
