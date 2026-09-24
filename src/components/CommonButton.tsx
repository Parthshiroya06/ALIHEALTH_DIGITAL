import {ActivityIndicator, Pressable, StyleSheet, Text} from 'react-native';
import React from 'react';
import {Colors, responsiveHeight, responsiveWidth, textStyle} from '@resources';
import {useTheme} from '@react-navigation/native';

type Props = {
  buttonStyle?: any;
  onPress: () => void;
  title: string;
  TitleStyle?: any;
  isLoading?: boolean;
};

const CommonButton = (props: Props) => {
  const colors = useTheme().colors;
  const {buttonStyle, title, TitleStyle, onPress, isLoading = false} = props;
  return (
    <Pressable
      style={[
        styles.flotButton,
        {backgroundColor: colors.DarkSlateBlue},
        buttonStyle,
      ]}
      onPress={onPress}
    >
      {isLoading ? (
        <ActivityIndicator size={25} color={Colors.offWhite} />
      ) : (
        <Text style={[styles.textStyles, {color: colors.text}, TitleStyle]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
};

export {CommonButton};

const styles = StyleSheet.create({
  flotButton: {
    width: responsiveWidth(90),
    height: responsiveHeight(5.5),
    borderRadius: responsiveWidth(2),
    marginTop: responsiveHeight(1.5),
    //backgroundColor: Colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  textStyles: {
    ...textStyle(18, 'Roboto'),
    // color: Colors.offWhite,
  },
});
