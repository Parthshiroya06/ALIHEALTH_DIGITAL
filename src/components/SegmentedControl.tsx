import React, {useEffect} from 'react';
import {
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import {useTheme} from '@react-navigation/native';
import {Colors} from '@resources';

const shadow = {
  shadowColor: '#000',
  shadowOffset: {
    width: 0,
    height: 2,
  },
  shadowOpacity: 0.23,
  shadowRadius: 2.62,
  elevation: 4,
};

// So that it stretches in landscape mode.
const width = Dimensions.get('screen').width - 32;

type Props = {
  tabs: string[];
  onChange: (index: number) => void;
  currentIndex?: number;
  segmentedControlBackgroundColor?: string;
  activeSegmentBackgroundColor?: string;
  textColor?: string;
  activeTextColor?: string;
};

const SegmentedControl = ({
  tabs = [],
  onChange = () => {},
  currentIndex = 0,
  segmentedControlBackgroundColor,
  activeSegmentBackgroundColor,
  textColor,
  activeTextColor = Colors.offWhite,
}: Props) => {
  // Follows the app theme unless colors are passed in
  const colors = useTheme().colors;
  const backgroundColor = segmentedControlBackgroundColor ?? colors.card;
  const activeBackgroundColor =
    activeSegmentBackgroundColor ?? colors.DarkSlateBlue;
  const inactiveTextColor = textColor ?? colors.secondaryText;
  const translateValue = (width - 4) / tabs.length;
  const [tabTranslate] = React.useState(new Animated.Value(0));

  useEffect(() => {
    Animated.spring(tabTranslate, {
      toValue: currentIndex * translateValue,
      stiffness: 180,
      damping: 30,
      mass: 1,
      useNativeDriver: true,
    }).start();
  }, [currentIndex, tabTranslate, translateValue]);

  return (
    <Animated.View
      style={[
        styles.segmentedControlWrapper,
        {backgroundColor, borderColor: colors.border},
      ]}
    >
      <Animated.View
        style={[
          styles.activeSegment,
          {
            width: (width - 4) / tabs.length,
            backgroundColor: activeBackgroundColor,
            transform: [{translateX: tabTranslate}],
          },
        ]}
      />
      {tabs.map((tab, index) => {
        const isCurrentIndex = currentIndex === index;
        return (
          <TouchableOpacity
            key={index}
            style={[styles.textWrapper]}
            onPress={() => onChange(index)}
            activeOpacity={0.7}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.textStyles,
                {color: inactiveTextColor},
                isCurrentIndex && {color: activeTextColor},
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        );
      })}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  segmentedControlWrapper: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    width: width,
    paddingVertical: 4,
  },
  activeSegment: {
    ...StyleSheet.absoluteFill,
    position: 'absolute',
    top: 0,
    marginVertical: 2,
    marginHorizontal: 2,
    borderRadius: 8,
    ...shadow,
  },
  textWrapper: {
    flex: 1,
    elevation: 9,
    paddingHorizontal: 5,
  },
  textStyles: {
    fontSize: 18,
    textAlign: 'center',
    fontWeight: '600',
  },
});

export {SegmentedControl};
