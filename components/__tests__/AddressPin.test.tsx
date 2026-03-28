import React from 'react';
import { render } from '@testing-library/react-native';
import { AddressPin } from '../AddressPin';

jest.mock('react-native-maps', () => {
  const { View } = require('react-native');
  return {
    Marker: (props: any) => <View testID="marker" {...props} />,
  };
});

describe('AddressPin', () => {
  it('renders marker at correct coordinate', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <AddressPin
        id="1"
        lat={-23.542}
        lng={-46.633}
        status="not_visited"
        onPress={onPress}
      />
    );
    const marker = getByTestId('marker');
    expect(marker.props.coordinate).toEqual({ latitude: -23.542, longitude: -46.633 });
  });
});
