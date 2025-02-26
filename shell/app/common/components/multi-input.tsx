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
import { isEmpty, map, remove, set } from 'lodash';
import { Icon, Input } from 'nusi';
import i18n from 'i18n';
import './multi-input.scss';

const MultiInput = (props: any) => {
  const { value, placeholder } = props;
  const [renderData, setValue] = React.useState([] as Array<string | undefined>);

  React.useEffect(() => {
    const curVal = isEmpty(value) ? [undefined] : value;
    setValue(curVal);
  }, [value]);

  const addOne = () => {
    const lastItem = renderData[renderData.length - 1];
    if (!isEmpty(lastItem)) {
      setValue([...renderData, undefined]);
      props.onChange([...renderData, undefined]);
    }
  };

  const dropOne = (index: number) => {
    const valArr = [...renderData];
    remove(valArr, (_v, idx) => idx === index);
    setValue(valArr);
    props.onChange(valArr);
  };

  const changeItemValue = (val: string, index: number) => {
    const valArr = [...renderData];
    set(valArr, `[${index}]`, val);
    setValue(valArr);
    props.onChange(valArr);
  };

  return (
    <div className="full-width">
      {
        map(renderData, (item: any, index: number) => {
          return (
            <div className="flex-box multi-input-item" key={index}>
              <Input className="multi-input-input flex-1" value={item} onChange={(e: any) => changeItemValue(e.target.value, index)} placeholder={placeholder || i18n.t('please enter')} />
              <div className="multi-input-icons">
                <Icon className="input-with-icon" type="plus-circle-o" onClick={() => addOne()} />
                {
                 index !== 0 ? <Icon className="input-with-icon" type="minus-circle-o" onClick={() => { dropOne(index); }} /> : null
               }
              </div>
            </div>
          );
        })
      }
    </div>
  );
};

export default MultiInput;
