import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useTheme} from '@react-navigation/native';
import {responsiveHeight, responsiveWidth, textStyle} from '@resources';
import {localize} from '@languages';

type Props = {
  title: string;
  value?: string | number | null;
  unit?: string;
  isEstimated?: boolean;
};

const MetricCard = (props: Props) => {
  const colors = useTheme().colors;
  const {title, value, unit, isEstimated = false} = props;
  return (
    <View style={[styles.card, {backgroundColor: colors.card}]}>
      <Text style={[textStyle(14), {color: colors.secondaryText}]}>
        {title}
      </Text>
      <Text style={[textStyle(24, 'Roboto400'), {color: colors.text}]}>
        {value ?? '--'}
        {value != null && unit ? (
          <Text style={[textStyle(14), {color: colors.secondaryText}]}>
            {' ' + unit}
          </Text>
        ) : null}
      </Text>
      {isEstimated && (
        <Text style={[textStyle(11), {color: colors.secondaryText}]}>
          {localize('estimated')}
        </Text>
      )}
    </View>
  );
};

export {MetricCard};

const styles = StyleSheet.create({
  card: {
    width: responsiveWidth(43),
    padding: responsiveWidth(3.5),
    borderRadius: responsiveWidth(3),
    marginBottom: responsiveHeight(1.5),
    gap: responsiveHeight(0.5),
  },
});
