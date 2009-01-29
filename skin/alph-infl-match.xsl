<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
    <xsl:import href="beta-uni-util.xsl"/>
    <xsl:import href="uni2ascii.xsl"/>
    
    <xsl:template name="check_infl_sets">
        <xsl:param name="selected_endings"/>
        <xsl:param name="current_data"/>
        <xsl:param name="match_pofs"/>
        <xsl:param name="strip_greek_vowel_length"/>
        <xsl:variable name="matches">
            <xsl:for-each select="$selected_endings//div[@class='alph-infl-set' and 
                ../div[@class='alph-dict']/span[(@class='alph-pofs') and (@context = $match_pofs)]]
                ">                    
                <xsl:variable name="ending_match">
                    <xsl:choose>
                        <xsl:when test="$strip_greek_vowel_length = true()">
                            <xsl:call-template name="uni-strip">
                                <xsl:with-param name="input" select="span[@class='alph-term']/span[@class='alph-suff']"/>
                                <xsl:with-param name="strip-vowels" select="true()"/>
                                <xsl:with-param name="strip-caps" select="false()"/>
                            </xsl:call-template>                              
                        </xsl:when>
                        <xsl:otherwise>
                            <xsl:value-of select="span[@class='alph-term']/span[@class='alph-suff']"/>
                        </xsl:otherwise>
                    </xsl:choose>
                </xsl:variable>
                <xsl:variable name="possible">
                    <xsl:for-each select="div[@class='alph-infl']">
                        <xsl:call-template name="find_infl_match">
                            <xsl:with-param name="current_data" select="$current_data"/>
                            <xsl:with-param name="filtered_data" select="(.)"/>
                            <xsl:with-param name="match_pofs" select="$match_pofs"/>
                        </xsl:call-template>
                    </xsl:for-each>
                </xsl:variable>
                <xsl:if test="$possible &gt; 0">,<xsl:value-of select="$ending_match"/>,</xsl:if>
            </xsl:for-each>    
        </xsl:variable>
        <xsl:value-of select="$matches"/>
    </xsl:template>
    
    <xsl:template name="find_infl_match">
        <xsl:param name="current_data"/>
        <xsl:param name="filtered_data"/>
        <xsl:param name="match_pofs"/>
        <xsl:param name="att_pos" select="0"/>
        
        <xsl:variable name="match_case_num"><xsl:value-of select="$current_data/@case"/>-<xsl:value-of select="$current_data/@num"/>-</xsl:variable>
        <xsl:variable name="match_gend"><xsl:value-of select="$current_data/@gend"/></xsl:variable>
        <xsl:variable name="match_decl"><xsl:value-of select="$current_data/@decl"/></xsl:variable>
        
        <xsl:choose>
            <!-- if we have the declension, match on it -->
            <xsl:when test="count($filtered_data/../..//span[@class='alph-decl' 
                and contains(@context,$match_decl)]) > 0">
                <xsl:value-of select="count($filtered_data//span[@class='alph-case'
                    and starts-with(@context,$match_case_num)
                    and contains(@context,$match_pofs)
                    and contains($match_gend,substring-before(substring-after(@context,$match_case_num),concat('-',$match_pofs)))
                    ])"/>                                
            </xsl:when>
            <!-- if we don't have a declension in the supplied selected ending data, just ignore it -->
            <xsl:when test="count($filtered_data/../..//span[@class='alph-decl']) = 0">
                <xsl:value-of select="count($filtered_data//span[@class='alph-case'
                    and starts-with(@context,$match_case_num)
                    and contains(@context,$match_pofs)
                    and contains($match_gend,substring-before(substring-after(@context,$match_case_num),concat('-',$match_pofs)))
                    ])"/>                
            </xsl:when>
            <xsl:otherwise/>
        </xsl:choose>
    </xsl:template>    
    
</xsl:stylesheet>